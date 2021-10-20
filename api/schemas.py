from typing import Optional
from pydantic import BaseModel, Field, EmailStr, HttpUrl

from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.helper import key_to_camel_case


class UserLoginSchema(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(...)
    g_recaptcha_response: Optional[str] = Field(None, alias='g-recaptcha-response')


class UserSignupSchema(UserLoginSchema):
    fullname: str = Field(...)
    organizationName: str = Field(...)

    class Config:
        alias_generator = key_to_camel_case


class EditUserSchema(BaseModel):
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)
    appearance: dict = Field({})


class EditUserPasswordSchema(BaseModel):
    old_password: str = Field(...)
    new_password: str = Field(...)


class UpdateTenantSchema(BaseModel):
    name: Optional[str] = Field(None)
    opt_out: Optional[bool] = Field(None)

    class Config:
        alias_generator = key_to_camel_case


class CreateProjectSchema(BaseModel):
    name: str = Field("my first project")


class CurrentContext(BaseModel):
    tenant_id: int = Field(...)
    user_id: int = Field(...)
    email: str = Field(...)


class AddSlackSchema(BaseModel):
    name: str = Field(...)
    url: HttpUrl = Field(...)


class EditSlackSchema(BaseModel):
    name: Optional[str] = Field(None)
    url: HttpUrl = Field(...)


class SearchErrorsSchema(BaseModel):
    platform: Optional[str] = Field(...)
    startDate: Optional[int] = Field(TimeUTC.now(-7))
    endDate: Optional[int] = Field(TimeUTC.now())
    density: Optional[int] = Field(7)
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)


#     TODO: events and filters


class AlertNotificationSchema(BaseModel):
    auth: str = Field(...)
    notifications: list = Field(...)


class CreateNotificationSchema(BaseModel):
    token: str = Field(...)
    notifications: list = Field(...)


class NotificationsViewSchema(BaseModel):
    ids: Optional[list] = Field(...)
    startTimestamp: int = Field(...)
    endTimestamp: int = Field(...)


class CreateEditJiraGithubSchema(BaseModel):
    provider: str = Field(...)
    username: str = Field(...)
    token: str = Field(...)
    url: str = Field(...)


class CreateEditWebhookSchema(BaseModel):
    webhookId: Optional[int] = Field(...)
    endpoint: str = Field(...)
    authHeader: Optional[str] = Field(...)
    name: Optional[str] = Field(...)


class CreateMemberSchema(BaseModel):
    userId: Optional[int] = Field(...)
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)


class EditPasswordByInvitationSchema(BaseModel):
    token: str = Field(...)
    invitation: str = Field(...)
    passphrase: str = Field(..., alias="pass")
    password: str = Field(...)
