import React from 'react'

const SAMPLE_INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', image: 'https://via.placeholder.com/80?text=Tomato' },
  { id: 'egg', name: 'Egg', image: 'https://via.placeholder.com/80?text=Egg' },
  { id: 'flour', name: 'Flour', image: 'https://via.placeholder.com/80?text=Flour' },
  { id: 'milk', name: 'Milk', image: 'https://via.placeholder.com/80?text=Milk' },
  { id: 'butter', name: 'Butter', image: 'https://via.placeholder.com/80?text=Butter' }
]

export default function IngredientBank({ onAdd }){
  return (
    <div className="ingredient-bank">
      <h4>Ingredient Bank</h4>
      <div className="bank-grid">
        {SAMPLE_INGREDIENTS.map(i => (
          <div key={i.id} className="ingredient-card">
            <img src={i.image} alt={i.name} />
            <div className="ing-name">{i.name}</div>
            <button onClick={() => onAdd({ name: i.name, image: i.image, amount: '' })}>Add</button>
          </div>
        ))}
      </div>
    </div>
  )
}
