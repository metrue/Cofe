# ☕ Cofe

**A beautifully simple blog and memo app that just works.**

Cofe is designed with simplicity in mind - write your thoughts, share your ideas, and let the platform handle the rest. Originally inspired by [tinymind](https://github.com/mazzzystar/tinymind), but evolved into something uniquely elegant.

![Cofe App Screenshot](https://github.com/metrue/cofe/blob/main/data/assets/images/Cofe-app.png?raw=true)

## ✨ Why Choose Cofe?

- **🎯 Zero Configuration** - Start writing immediately, no complex setup
- **📱 Works Everywhere** - Responsive design that looks great on any device  
- **⚡ Lightning Fast** - Optimized performance with smart caching
- **🔒 Secure by Default** - GitHub OAuth integration for peace of mind
- **💾 Your Data, Your Control** - Everything stored in your GitHub repository

## 🌟 Key Features

### 📝 **Effortless Writing**
- Rich markdown support with live preview
- Syntax highlighting for code blocks
- Mathematical expressions with KaTeX
- Image support with drag & drop

### 💭 **Quick Memos**  
- Capture thoughts instantly
- Clean, distraction-free interface
- Smart timestamps and organization
- Like system for engagement

### 🌐 **External Discussions**
- Automatic integration with Hacker News, Reddit, and V2EX comments
- No manual setup required - just add discussion links to your posts
- Beautifully rendered comment threads

### 🎨 **Beautiful Design**
- Minimalist interface inspired by the best
- Carefully crafted typography and spacing
- Dark mode support (coming soon)
- Mobile-first responsive design

## 🚀 Quick Start

Getting started with Cofe is incredibly simple:

### 1. **Set up GitHub OAuth**
Create a new OAuth App in your GitHub settings and get your credentials.

### 2. **Clone and Run**
```bash
git clone https://github.com/metrue/Cofe.git
cd Cofe
npm install

# Set your environment variables
export GITHUB_USERNAME='your-username'
export GITHUB_ID='your-github-oauth-id'  
export GITHUB_SECRET='your-github-oauth-secret'
export NEXTAUTH_SECRET='your-nextauth-secret'

# Start writing!
npm run dev
```

### 3. **Start Creating**
- Visit `http://localhost:3000` 
- Sign in with GitHub
- Start writing your first post or memo
- That's it! 🎉

## 🛠️ Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/metrue/Cofe)

Or deploy anywhere that supports Next.js applications.

## 🎯 Perfect For

- **Personal Blogs** - Share your thoughts and expertise
- **Developer Journals** - Document your coding journey  
- **Project Notes** - Keep track of ideas and progress
- **Knowledge Sharing** - Build your personal knowledge base

## 🤝 Contributing

Cofe is open source and contributions are welcome! Whether it's:
- 🐛 Bug reports and fixes
- ✨ New feature suggestions  
- 📝 Documentation improvements
- 🎨 UI/UX enhancements

Check out our [development guidelines](./CLAUDE.md) for best practices.

## 📋 Technical Details

For developers who want to know more:
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js with GitHub OAuth
- **Data Storage**: GitHub repository (JSON files)
- **Deployment**: Vercel-ready, works anywhere

*API documentation available in [docs/API.md](./docs/API.md) for advanced integrations.*

---

**Made with ☕ and lots of ❤️**

*Fork it, star it, make it yours.*