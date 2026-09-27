/**
 * 教师端 - 上传课程资料页（A10.md 十二节）
 */
import { UploadPanel } from '@/components/upload/UploadPanel';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata = { title: '上传课程资料' };

export default function TeacherUploadPage() {
  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { href: '/', label: '首页' },
          { href: '/teacher/upload', label: '上传资料' },
        ]}
      />
      <PageHeader
        eyebrow="Teacher · Upload"
        title="上传课程资料"
        description="上传《数据结构》教材（PDF/TXT），系统将自动解析、抽取知识点与关系并生成知识图谱。"
        accent="blue"
      />
      <UploadPanel />
    </div>
  );
}
