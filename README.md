# キャバクラ AI 面接官

AI面接官によるキャバクラ面接シミュレーションアプリです。
Vapiを使ったリアルタイム音声対話で、実際の面接を体験できます。

## 機能

- リアルタイム音声対話（Vapi使用）
- 話者状態の視覚的表示（ユーザー/AI/考え中）
- リアルタイム文字起こし表示
- キャバクラ面接官AIによる面接

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、Vapi APIキーを設定してください：

```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key_here
```

Vapi APIキーは[Vapi Dashboard](https://dashboard.vapi.ai)から取得できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで[http://localhost:3000](http://localhost:3000)を開いてください。

## 使い方

1. アプリを開く
2. 中央のマイクボタンをタップして面接を開始
3. AI面接官の質問に音声で回答
4. 会話は下部にリアルタイムで文字起こし表示されます
5. 面接が終わったら「面接を終了する」ボタンをタップ

## 状態表示

- **グレー**: 待機中（面接開始前）
- **緑色**: あなたが話しています
- **紫色**: 面接官が話しています
- **黄色（点滅）**: 考え中

## 技術スタック

- Next.js 16
- TypeScript
- Tailwind CSS
- Vapi Web SDK

## ライセンス

MIT
