"use client";

import { trpc } from "@/trpc/client";
import { FIELD_LABELS, getCompletionPercentage } from "@/types/candidate";
import type { Candidate, CandidateProfile } from "@/types/candidate";
import { useState } from "react";

function StatusBadge({ status }: { status: Candidate["status"] }) {
  const colors = {
    interviewing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    completed: "bg-green-500/20 text-green-400 border-green-500/50",
    incomplete: "bg-red-500/20 text-red-400 border-red-500/50",
  };

  const labels = {
    interviewing: "面接中",
    completed: "完了",
    incomplete: "未完了",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs border ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          percentage === 100 ? "bg-green-500" : "bg-blue-500"
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-700">
      <span className="text-gray-400">{label}</span>
      <span className={value ? "text-white" : "text-gray-600"}>
        {value ?? "未回答"}
      </span>
    </div>
  );
}

function CandidateDetail({
  candidate,
  onClose,
  onDelete,
}: {
  candidate: Candidate;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [showMessages, setShowMessages] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900">
          <div>
            <h2 className="text-xl font-bold text-white">
              {candidate.profile.name || "名前未登録"}
            </h2>
            <p className="text-gray-400 text-sm">
              {new Date(candidate.createdAt).toLocaleString("ja-JP")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={candidate.status} />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* プロフィール情報 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">プロフィール情報</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              {(Object.keys(FIELD_LABELS) as (keyof CandidateProfile)[]).map((field) => (
                <ProfileField
                  key={field}
                  label={FIELD_LABELS[field]}
                  value={candidate.profile[field]}
                />
              ))}
            </div>
          </div>

          {/* 完了率 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">情報入力率</span>
              <span className="text-white">{getCompletionPercentage(candidate.profile)}%</span>
            </div>
            <ProgressBar percentage={getCompletionPercentage(candidate.profile)} />
          </div>

          {/* メタ情報 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400">使用プロバイダー</p>
              <p className="text-white capitalize">{candidate.provider}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400">メッセージ数</p>
              <p className="text-white">{candidate.messages.length}</p>
            </div>
          </div>

          {/* 会話履歴 */}
          <div>
            <button
              onClick={() => setShowMessages(!showMessages)}
              className="flex items-center gap-2 text-gray-400 hover:text-white"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showMessages ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              会話履歴を{showMessages ? "非表示" : "表示"}
            </button>

            {showMessages && (
              <div className="mt-3 bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
                {candidate.messages.length === 0 ? (
                  <p className="text-gray-500 text-center">会話履歴がありません</p>
                ) : (
                  candidate.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-green-600/30 text-green-100"
                            : "bg-purple-600/30 text-purple-100"
                        }`}
                      >
                        <p className="text-xs opacity-70 mb-1">
                          {msg.role === "user" ? "候補者" : "面接官"}
                        </p>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* アクション */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              削除
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  onClick,
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  const completion = getCompletionPercentage(candidate.profile);

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-800/50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">
            {candidate.profile.name || "名前未登録"}
          </p>
          <p className="text-sm text-gray-500">
            {candidate.profile.age ? `${candidate.profile.age}歳` : "年齢未登録"}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={candidate.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ProgressBar percentage={completion} />
          <span className="text-sm text-gray-400 w-12">{completion}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {candidate.profile.desiredPosition || "-"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {candidate.profile.expectedSalary || "-"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {new Date(candidate.createdAt).toLocaleDateString("ja-JP")}
      </td>
    </tr>
  );
}

export default function AdminPage() {
  const { data: candidates, isLoading, refetch } = trpc.interview.getAllCandidates.useQuery();
  const deleteMutation = trpc.interview.deleteCandidate.useMutation({
    onSuccess: () => refetch(),
  });

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const handleDelete = (id: string) => {
    if (confirm("この候補者を削除しますか？")) {
      deleteMutation.mutate({ id });
      setSelectedCandidate(null);
    }
  };

  // 統計
  const stats = candidates
    ? {
        total: candidates.length,
        completed: candidates.filter((c) => c.status === "completed").length,
        interviewing: candidates.filter((c) => c.status === "interviewing").length,
        incomplete: candidates.filter((c) => c.status === "incomplete").length,
      }
    : { total: 0, completed: 0, interviewing: 0, incomplete: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              管理者ダッシュボード
            </h1>
            <p className="text-gray-400 text-sm mt-1">面接候補者一覧</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            面接画面へ
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm">総候補者数</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-green-900/30 rounded-xl p-4 border border-green-500/30">
            <p className="text-green-400 text-sm">面接完了</p>
            <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
          </div>
          <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-500/30">
            <p className="text-yellow-400 text-sm">面接中</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.interviewing}</p>
          </div>
          <div className="bg-red-900/30 rounded-xl p-4 border border-red-500/30">
            <p className="text-red-400 text-sm">未完了</p>
            <p className="text-3xl font-bold text-red-400">{stats.incomplete}</p>
          </div>
        </div>

        {/* 候補者テーブル */}
        <div className="bg-gray-800/30 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    候補者
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    入力率
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    希望職種
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    希望年収
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    面接日
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : candidates?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      まだ候補者がいません
                    </td>
                  </tr>
                ) : (
                  candidates?.map((candidate) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      onClick={() => setSelectedCandidate(candidate)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 詳細モーダル */}
      {selectedCandidate && (
        <CandidateDetail
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onDelete={() => handleDelete(selectedCandidate.id)}
        />
      )}
    </div>
  );
}
