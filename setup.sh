#!/bin/bash

echo "🔧 環境セットアップ開始..."

# nvmチェック
if ! command -v nvm &> /dev/null
then
  echo "❌ nvmがインストールされていません"
  exit 1
fi

# Node適用
echo "📦 Nodeバージョン適用"
nvm use || nvm install

# npm prefix問題修正
echo "🧹 npm設定修正"
npm config delete prefix 2>/dev/null

# 依存関係
echo "📥 npm install"
npm install

# Claude CLI
echo "🤖 Claude CLIインストール"
npm install -g @anthropic-ai/claude-code

echo "✅ セットアップ完了！"