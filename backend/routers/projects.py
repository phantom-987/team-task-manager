from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/api/projects", tags=["projects"])


def get_membership(project_id: int, user: models.User, db: Session):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    membership = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    return project, membership


def require_admin(project_id: int, user: models.User, db: Session):
    project, membership = get_membership(project_id, user, db)
    if membership.role != models.ProjectRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return project, membership


def _project_out(project: models.Project, user_id: int) -> dict:
    my_role = next(
        (m.role.value for m in project.members if m.user_id == user_id), None
    )
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description or "",
        "owner_id": project.owner_id,
        "created_at": project.created_at,
        "member_count": len(project.members),
        "task_count": len(project.tasks),
        "my_role": my_role,
    }


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(models.ProjectMember).filter_by(user_id=current_user.id).all()
    projects = [m.project for m in memberships]
    return [_project_out(p, current_user.id) for p in projects]


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project = models.Project(
        name=payload.name,
        description=payload.description or "",
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()

    membership = models.ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=models.ProjectRole.admin,
    )
    db.add(membership)
    db.commit()
    db.refresh(project)
    return _project_out(project, current_user.id)


@router.get("/{project_id}", response_model=schemas.ProjectDetail)
def get_project(
    project_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project, membership = get_membership(project_id, current_user, db)
    base = _project_out(project, current_user.id)
    members = [
        {
            "id": m.id,
            "user_id": m.user_id,
            "username": m.user.username,
            "email": m.user.email,
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m in project.members
    ]
    return {**base, "members": members}


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = require_admin(project_id, current_user, db)
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    db.commit()
    db.refresh(project)
    return _project_out(project, current_user.id)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = require_admin(project_id, current_user, db)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete it")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/members", status_code=201)
def add_member(
    project_id: int,
    payload: schemas.AddMember,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(project_id, current_user, db)

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with that email")

    existing = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = models.ProjectMember(
        project_id=project_id, user_id=user.id, role=payload.role
    )
    db.add(member)
    db.commit()
    return {"message": f"{user.username} added as {payload.role.value}"}


@router.patch("/{project_id}/members/{user_id}/role")
def update_member_role(
    project_id: int,
    user_id: int,
    payload: schemas.UpdateMemberRole,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(project_id, current_user, db)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    membership = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    membership.role = payload.role
    db.commit()
    return {"message": "Role updated"}


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(
    project_id: int,
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = require_admin(project_id, current_user, db)

    if user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    membership = db.query(models.ProjectMember).filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(membership)
    db.commit()