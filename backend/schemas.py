from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from models import TaskStatus, TaskPriority, ProjectRole


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_valid(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Project name must be at least 2 characters")
        return v.strip()


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class MemberOut(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    role: ProjectRole
    joined_at: datetime

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    owner_id: int
    created_at: datetime
    member_count: int
    task_count: int
    my_role: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectDetail(ProjectOut):
    members: List[MemberOut] = []


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assignee_id: Optional[int] = None
    status: Optional[TaskStatus] = TaskStatus.todo
    priority: Optional[TaskPriority] = TaskPriority.medium
    due_date: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Task title must be at least 2 characters")
        return v.strip()


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    project_id: int
    creator_id: int
    assignee_id: Optional[int]
    assignee_username: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    is_overdue: bool = False

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_projects: int
    total_tasks: int
    todo: int
    in_progress: int
    done: int
    overdue: int
    recent_tasks: List[TaskOut] = []


class AddMember(BaseModel):
    email: str
    role: Optional[ProjectRole] = ProjectRole.member


class UpdateMemberRole(BaseModel):
    role: ProjectRole