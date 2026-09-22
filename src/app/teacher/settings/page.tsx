/**
 * 教师端 - LLM 接入设置页：自定义协议格式 / Base URL / Key / 模型，「hi」测连通。
 */
import { LLMSettingsPanel } from '@/components/settings/LLMSettingsPanel';

export const metadata = { title: '模型接入设置 · A10' };

export default function TeacherSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">模型接入设置</h1>
        <p className="mt-1 text-sm text-gray-600">
          自助接入自定义大模型：选择协议格式（OpenAI 兼容 / Chat / Responses、Anthropic、Gemini），
          填写 Base URL 与 API Key，「hi」一键测连通后立即启用。
        </p>
      </div>
      <LLMSettingsPanel />
    </div>
  );
}
