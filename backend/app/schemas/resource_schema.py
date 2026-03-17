from pydantic import BaseModel

class ResourceBase(BaseModel):
    resource_type: str
    total: int
    available: int

class ResourceCreate(ResourceBase):
    pass

class Resource(ResourceBase):
    id: int
    class Config:
        from_attributes = True
