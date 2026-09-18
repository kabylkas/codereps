from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_role
from app.users.models import User
from app.users import service
from app.users.schemas import UpdateRoleRequest, UpdateActiveRequest
from app.auth.schemas import UserResponse

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    role: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return await service.get_users(db, role=role)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_role(
    user_id: str,
    data: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = await service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.role not in ("admin", "professor", "student"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = data.role
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/active", response_model=UserResponse)
async def update_active(
    user_id: str,
    data: UpdateActiveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = await service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = data.is_active
    await db.commit()
    await db.refresh(user)
    return user
