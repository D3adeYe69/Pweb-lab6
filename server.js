import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const recipesFile = path.join(__dirname, 'recipes.json')

const app = express()
app.use(cors())
app.use(express.json())

function readRecipes() {
  try {
    const data = fs.readFileSync(recipesFile, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    return { nextId: 1, recipes: [] }
  }
}

function writeRecipes(data) {
  fs.writeFileSync(recipesFile, JSON.stringify(data, null, 2))
}

app.get('/recipes', (req, res) => {
  const data = readRecipes()
  res.json(data.recipes)
})

app.post('/recipes', (req, res) => {
  const data = readRecipes()
  const newRecipe = {
    id: data.nextId,
    ...req.body
  }
  data.recipes.unshift(newRecipe)
  data.nextId += 1
  writeRecipes(data)
  res.json(newRecipe)
})

app.put('/recipes/:id', (req, res) => {
  const data = readRecipes()
  const id = parseInt(req.params.id)
  const index = data.recipes.findIndex(r => r.id === id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  
  data.recipes[index] = { ...data.recipes[index], ...req.body, id }
  writeRecipes(data)
  res.json(data.recipes[index])
})

app.delete('/recipes/:id', (req, res) => {
  const data = readRecipes()
  const id = parseInt(req.params.id)
  data.recipes = data.recipes.filter(r => r.id !== id)
  writeRecipes(data)
  res.json({ success: true })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Recipe API server running on http://localhost:${PORT}`)
})
