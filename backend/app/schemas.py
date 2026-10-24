from pydantic import BaseModel, ConfigDict, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool

class VehicleIn(BaseModel):
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=80)
    price: float = Field(ge=0)
    quantity: int = Field(ge=0)

class VehicleOut(VehicleIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
