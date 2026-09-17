from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.tenant import User, Organization, OrganizationMember
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi zaten kullanımda."
        )

    # 1. Create User
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name
    )
    db.add(user)
    await db.flush()

    # 2. Create Organization
    org_name = user_in.organization_name or f"{user_in.full_name or 'Şirket'} Çalışma Alanı"
    slug = org_name.lower().replace(" ", "-") + f"-{user.id[:4]}"
    org = Organization(
        name=org_name,
        slug=slug
    )
    db.add(org)
    await db.flush()

    # 3. Create Membership as Owner
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner"
    )
    db.add(member)
    await db.commit()

    token = create_access_token({"sub": user.id, "org_id": org.id})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        current_organization_id=org.id
    )

@router.post("/login", response_model=Token)
async def login(login_in: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_in.email))
    user = result.scalars().first()

    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı."
        )

    # Find primary organization
    mem_result = await db.execute(
        select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    )
    membership = mem_result.scalars().first()
    org_id = membership.organization_id if membership else None

    token = create_access_token({"sub": user.id, "org_id": org_id})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        current_organization_id=org_id
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
