/**
 * 管理员后台首页：服务端二次鉴权（仅 admin），聚合用户/密钥/图数据三大维护面板。
 * 页面级访问另由 src/proxy.ts 守卫，这里做纵深防御。
 */
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserAdminPanel } from '@/components/admin/UserAdminPanel';
import { LLMKeysPanel } from '@/components/admin/LLMKeysPanel';
import { CourseAdminPanel } from '@/components/admin/CourseAdminPanel';

export const metadata = { title: '管理后台' };

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'admin') redirect('/login?error=forbidden');

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: '/', label: '首页' },
          { href: '/admin', label: '管理后台' },
        ]}
      />
      <PageHeader
        eyebrow="Admin · Console"
        title="系统管理后台"
        description="维护用户账号、大模型 API Key 密钥池与课程图数据。所有管理接口均要求 admin 角色，向下兼容教师/学生功能。"
        accent="amber"
      />
      <div className="space-y-5">
        <UserAdminPanel />
        <LLMKeysPanel />
        <CourseAdminPanel />
      </div>
    </div>
  );
}
