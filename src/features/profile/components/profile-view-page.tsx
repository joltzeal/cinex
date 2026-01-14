import PageContainer from "@/components/layout/page-container";
import { ChangePasswordCard, AccountSettingsCards } from "@daveyplate/better-auth-ui";

export default function ProfileViewPage() {
  return (
    <PageContainer>
      <div className="container mx-auto px-6 space-y-6">
        <h1 className="text-2xl font-bold mb-6">账户设置</h1>
 <ChangePasswordCard localization={{
          CHANGE_PASSWORD: "修改你的密码",
          CHANGE_PASSWORD_DESCRIPTION: "为了保护你的账户安全，请定期更改密码。",
          CURRENT_PASSWORD: "当前密码",
          NEW_PASSWORD: "新密码",
          CHANGE_PASSWORD_SUCCESS: "密码已成功更新！",
          SET_PASSWORD: "设置密码",
          CHANGE_PASSWORD_INSTRUCTIONS: "为了保护你的账户安全，请设置一个强密码。",
          SAVE: "保存",
        }} />
        <AccountSettingsCards localization={{
          NAME: "用户名",
          NAME_PLACEHOLDER: "John",
          NAME_DESCRIPTION: "请输入您的全名，或一个显示名称。",
          NAME_INSTRUCTIONS: "最多使用 32 个字符。",
          EMAIL: "邮箱",
          EMAIL_PLACEHOLDER: "example@example.com",
          EMAIL_DESCRIPTION: "请输入您用于登录的电子邮箱地址。",
          EMAIL_INSTRUCTIONS: "请输入有效的电子邮件地址。",
          SAVE: "保存"
        }} />
        {/* <UpdateAvatarCard localization={{
          AVATAR: '头像',
          UPLOAD_AVATAR: '上传头像',
          AVATAR_DESCRIPTION: "点击头像，从您的文件中上传自定义图像。",
          AVATAR_INSTRUCTIONS: "头像可选，但强烈推荐设置。",
          SAVE: "保存"
        }} /> */}
       
      </div>
    </PageContainer>
  );
}
