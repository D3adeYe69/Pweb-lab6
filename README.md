# 🍳 Recipe Box

A modern React web app for managing recipes with a clean, stylish interface. Create, edit, delete, and organize recipes with built-in ingredient banking, cuisine filtering, and a complete dark/light theme system.

## ✨ Features

### Core Functionality
- **CRUD Operations**: Create, read, update, and delete recipes
- **Recipe Details**: Title, ingredients with emoji, markdown steps, tags/cuisines, times, servings, notes
- **Ingredient Banking**: 29 emoji ingredients with batch selection
- **Like/Favorites**: Dedicated favorites section with star indicator
- **Cuisine Filtering**: Auto-generated filter buttons, active state styling
- **Dark/Light Theme**: CSS variables + localStorage persistence
- **Persistent Storage**: Browser `localStorage` with auto-increment IDs

### UI/UX
- Gradient header, polished cards, hover effects
- Separate favorites/recipes sections
- Markdown rendering, emoji ingredient icons
- Full keyboard and mouse support

## 🚀 Quick Start

```powershell
npm install
npm run dev
```

Runs the Vite app on `http://localhost:5173`

## 📋 User Flows

**Add Recipe**: Click "+ New Recipe" → Fill form → Use Ingredient Bank (batch select) or add custom → Add markdown steps → Set tags/times → Create

**Organize**: Like recipes (☆→★) move to Favorites section, filter by cuisine, edit/delete, view full recipe with markdown

**Theme**: Toggle ☀️/🌙 in header — saved to localStorage

## 🏗️ Tech Stack

- **Frontend**: React 18.2, Vite 5.0, marked 5.0
- **Styling**: CSS variables, flexbox, gradients

## 📁 Structure

```
├── src/App.jsx           # Main component
├── src/IngredientBank    # 29 emoji ingredients
├── src/styles.css        # Theme variables
└── package.json          # Project scripts and dependencies
```

## 🎯 Features

✅ CRUD operations with form validation  
✅ Persistent recipes in browser `localStorage`  
✅ Ingredient banking + custom ingredients  
✅ Markdown step rendering  
✅ Auto-increment ID system  
✅ Like/favorites with visual distinction  
✅ Cuisine filtering + active states  
✅ Dark/light theme toggle  
✅ Responsive design  
✅ Git history with meaningful commits  

## 📝 Lab Requirements

✅ Description and flows in this README  
✅ Browser persistence via localStorage  
✅ Dark/light theme  
✅ Accessible UI  
✅ Ready for GitHub Pages deployment
