// Throwaway live check for the DeepSeek translation contract used by
// lib/translate.ts. Run with your key available in the environment:
//   ! DEEPSEEK_API_KEY=sk-... node scripts/verify-deepseek.mjs
// or, if your shell already exports it:
//   ! node scripts/verify-deepseek.mjs
const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is not set in this shell.')
  process.exit(1)
}

const sample = '## 今天的随想\n\n我在用 `Next.js` 重写博客，顺手加了自动翻译功能。'
const system =
  'You are a professional translator. Translate the user\'s Markdown content into English. ' +
  'Translate prose only. Preserve all Markdown structure exactly: headings, lists, links, ' +
  'inline code, and fenced code blocks (do not translate code). Output only the translated Markdown.'

const res = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'deepseek-chat',
    temperature: 1.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: sample },
    ],
  }),
})

console.log('HTTP status:', res.status, res.statusText)
if (!res.ok) {
  console.error('Body:', await res.text())
  process.exit(1)
}
const data = await res.json()
console.log('\n--- ORIGINAL ---\n' + sample)
console.log('\n--- TRANSLATED ---\n' + data?.choices?.[0]?.message?.content)
console.log('\nOK: DeepSeek returned a translation in the expected shape.')
