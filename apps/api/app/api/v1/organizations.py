from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_organization
from app.models.tenant import User, Organization, OrganizationMember
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse, MemberResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.get("", response_model=List[OrganizationResponse])
async def list_user_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == current_user.id)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=OrganizationResponse)
async def create_organization(
    org_in: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    slug = org_in.name.lower().replace(" ", "-") + f"-{str(uuid.uuid4())[:4]}"
    org = Organization(name=org_in.name, slug=slug)
    db.add(org)
    await db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(member)
    await db.commit()
    return org

@router.get("/current", response_model=OrganizationResponse)
async def get_current_org(current_org: Organization = Depends(get_current_organization)):
    return current_org

@router.patch("/current", response_model=OrganizationResponse)
async def update_current_org(
    org_in: OrganizationUpdate,
    current_org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    if org_in.name:
        current_org.name = org_in.name
    if org_in.monthly_token_limit:
        current_org.monthly_token_limit = org_in.monthly_token_limit
    if org_in.monthly_budget_usd:
        current_org.monthly_budget_usd = org_in.monthly_budget_usd
    await db.commit()
    await db.refresh(current_org)
    return current_org
