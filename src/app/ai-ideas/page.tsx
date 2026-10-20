import AiIdeas from "@/components/ai-ideas";

export const metadata = {
  title: "AI 项目机会库 - 星轨",
  description: "面向个人、自由职业者与中小企业的 AI 项目方向：智能体、工作流自动化、推广获客、企业降本、一人公司微 SaaS，附 GitHub 开源参考。",
};

export default function AiIdeasPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 1040, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <AiIdeas />
    </div>
  );
}
