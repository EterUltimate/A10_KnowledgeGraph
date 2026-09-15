/**
 * 教师端 - 上传课程资料页（A10.md 十二节）
 */
import { UploadPanel } from '@/components/upload/UploadPanel';

export const metadata = { title: '上传课程资料 · A10' };

export default function TeacherUploadPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">上传课程资料</h1>
        <p className="mt-1 text-sm text-gray-600">
          上传《数据结构》教材（PDF/TXT），系统将自动解析、抽取知识点与关系并生成知识图谱。
        </p>
      </div>
      <UploadPanel />
    </div>
  );
}
