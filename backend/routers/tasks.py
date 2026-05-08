from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
import models, schemas, auth
from routers.projects import get_membership, require_admin

router = APIRouter(tags=["tasks"])


def _task_out(task: models.Task) -> dict:
    now = datetime.now(timezone.utc)
    due = task.due_date
    if due and due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    is_overdue = bool(due and due < now and task.status != models.TaskStatus.done)
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description or "",
        "project_id": task.project_id,
        "creator_id": task.creator_id,
        "assignee_id": task.assignee_id,
        "assignee_username": task.assignee.username if task.assignee else None,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "is_overdue": is_overdue,
    }


@router.get("/api/projects/{project_id}/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: int,
    status: Optional[str] = None,
    assignee_id: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    get_membership(project_id, current_user, db)
    query = db.query(models.Task).filter(models.Task.project_id == project_id)
    if status:
        query = query.filter(models.Task.status == status)
    if assignee_id:
        query = query.filter(models.Task.assignee_id == assignee_id)
    tasks = query.order_by(models.Task.created_at.desc()).all()
    return [_task_out(t) for t in tasks]


@router.post("/api/projects/{project_id}/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(
    project_id: int,
    payload: schemas.TaskCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    project, membership = get_membership(project_id, current_user, db)

    if membership.role != models.ProjectRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can create tasks")

    if payload.assignee_id:
        assignee_membership = db.query(models.ProjectMember).filter_by(
            project_id=project_id, user_id=payload.assignee_id
        ).first()
        if not assignee_membership:
            raise HTTPException(status_code=400, detail="Assignee must be a project member")

    task = models.Task(
        title=payload.title,
        description=payload.description or "",
        project_id=project_id,
        creator_id=current_user.id,
        assignee_id=payload.assignee_id,
        status=payload.status or models.TaskStatus.todo,
        priority=payload.priority or models.TaskPriority.medium,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_out(task)


@router.get("/api/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    get_membership(task.project_id, current_user, db)
    return _task_out(task)


@router.put("/api/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    _, membership = get_membership(task.project_id, current_user, db)
    is_admin = membership.role == models.ProjectRole.admin
    is_assignee = task.assignee_id == current_user.id

    if not is_admin and not is_assignee:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    if not is_admin and is_assignee:
        if payload.status is not None:
            task.status = payload.status
    else:
        if payload.title is not None:
            task.title = payload.title
        if payload.description is not None:
            task.description = payload.description
        if payload.status is not None:
            task.status = payload.status
        if payload.priority is not None:
            task.priority = payload.priority
        if payload.due_date is not None:
            task.due_date = payload.due_date
        if payload.assignee_id is not None:
            if payload.assignee_id != 0:
                assignee_m = db.query(models.ProjectMember).filter_by(
                    project_id=task.project_id, user_id=payload.assignee_id
                ).first()
                if not assignee_m:
                    raise HTTPException(status_code=400, detail="Assignee must be a member")
            task.assignee_id = payload.assignee_id if payload.assignee_id != 0 else None

    db.commit()
    db.refresh(task)
    return _task_out(task)


@router.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _, membership = get_membership(task.project_id, current_user, db)
    if membership.role != models.ProjectRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete tasks")
    db.delete(task)
    db.commit()


@router.get("/api/dashboard", response_model=schemas.DashboardStats)
def dashboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(models.ProjectMember).filter_by(user_id=current_user.id).all()
    project_ids = [m.project_id for m in memberships]

    all_tasks = db.query(models.Task).filter(
        models.Task.project_id.in_(project_ids)
    ).order_by(models.Task.created_at.desc()).all()

    now = datetime.now(timezone.utc)

    def is_overdue(t):
        due = t.due_date
        if due and due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return bool(due and due < now and t.status != models.TaskStatus.done)

    return {
        "total_projects": len(project_ids),
        "total_tasks": len(all_tasks),
        "todo": sum(1 for t in all_tasks if t.status == models.TaskStatus.todo),
        "in_progress": sum(1 for t in all_tasks if t.status == models.TaskStatus.in_progress),
        "done": sum(1 for t in all_tasks if t.status == models.TaskStatus.done),
        "overdue": sum(1 for t in all_tasks if is_overdue(t)),
        "recent_tasks": [_task_out(t) for t in all_tasks[:10]],
    }