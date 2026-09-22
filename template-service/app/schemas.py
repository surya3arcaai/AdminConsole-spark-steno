"""
Pydantic schemas for Template Service.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ============== Template Schemas ==============

class TemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    content: str = Field(..., min_length=1)
    variables_schema: Dict[str, Any] = Field(default_factory=dict)
    location_id: Optional[str] = None
    is_default: Optional[bool] = False


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    content: Optional[str] = None
    variables_schema: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    location_id: Optional[str] = None
    is_default: Optional[bool] = None


class TemplateResponse(TemplateBase):
    id: str
    type: str
    version: int
    status: str
    location_id: Optional[str] = None
    is_default: bool = False
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TemplateSummaryResponse(BaseModel):
    id: str
    type: str
    name: str
    description: Optional[str]
    content: str
    version: int
    status: str
    location_id: Optional[str] = None
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Template Version Schemas ==============

class TemplateVersionResponse(BaseModel):
    id: str
    template_id: str
    version: int
    content: str
    variables_schema: Dict[str, Any]
    created_by: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Preview/Render Schemas ==============

class TemplatePreviewRequest(BaseModel):
    variables: Dict[str, Any] = Field(default_factory=dict)


class TemplatePreviewResponse(BaseModel):
    template_id: str
    template_name: str
    rendered_content: str
    variables_used: Dict[str, Any]


class TemplateRenderRequest(BaseModel):
    variables: Dict[str, Any] = Field(default_factory=dict)
    output_format: str = Field(default="html", pattern="^(html|text|pdf)$")


class TemplateRenderResponse(BaseModel):
    template_id: str
    output_format: str
    content: str


# ============== Import/Export Schemas ==============

class TemplateExportResponse(BaseModel):
    id: str
    type: str
    name: str
    description: Optional[str]
    content: str
    variables_schema: Dict[str, Any]
    version: int
    exported_at: datetime


class TemplateImportRequest(BaseModel):
    type: str = Field(..., pattern="^(clinical|discharge)$")
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    content: str = Field(..., min_length=1)
    variables_schema: Dict[str, Any] = Field(default_factory=dict)
