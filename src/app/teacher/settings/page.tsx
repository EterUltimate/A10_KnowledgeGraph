/**
 * 教师端 - LLM 接入设置页：自定义协议格式 / Base URL / Key / 模型，「hi」测连通。
 */
import { LLMSettingsPanel } from '@/components/settings/LLMSettingsPanel';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata = { title: '模型接入设置' };

export default function TeacherSettingsPage() {
  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { href: '/', label: '首页' },
          { href: '/teacher/settings', label: '模型接入设置' },
        ]}
      />
      <PageHeader
        eyebrow="Teacher · LLM"
        title="模型接入设置"
        description="自助接入自定义大模型：选择协议格式（OpenAI 兼容 / Chat / Responses、Anthropic、Gemini），填写接口地址与密钥，一键测连通后立即启用。"
        accent="amber"
      />
      <LLMSettingsPanel />
    </div>
  );
}
