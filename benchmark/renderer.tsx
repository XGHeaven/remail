import React, { Fragment, createContext, useContext, useState } from 'react'
import { Suite } from 'benchmark'

import { renderToStaticMarkup as server } from 'react-dom/server'
import { renderToString as remail } from '../packages/renderer'

const suite = new Suite()

const hostDOM = (
  <div>
    <header>This is a header</header>
    <button>Click</button>
  </div>
)

const hugeDOM = (
  <div>
    {new Array(100).fill(0).map((_, i) => (
      <span>row-{i}</span>
    ))}
  </div>
)

function TodoList(props: any) {
  const { todos } = useContext(TodoContext)
  return (
    <div>
      {todos.map((todo: any, i: number) => <div key={i}>{todo.title}</div>)}
    </div>
  )
}

function TodoHeader() {
  return (
    <header>This is a header</header>
  )
}

function TodoInput() {
  const [input, setInput] = useState('')
  const { onAdd } = useContext(TodoContext)
  return (
    <Fragment>
      <input value={input} onChange={e => setInput(e.target.value)}/>
      <button onClick={() => onAdd(input)}>Add</button>
    </Fragment>
  )
}

const TodoContext = createContext<any>(null)

const todoList = (
  <div>
    <TodoContext.Provider value={{
      todos: new Array(10).fill({name: 'foo'}),
      onAdd: () => {}
    }}>
      <TodoHeader/>
      <TodoInput/>
      <TodoList/>
    </TodoContext.Provider>
  </div>
)

const hugeComponet = (
  <div>
    {new Array(100).fill(0).map((_, i) => (
      todoList
    ))}
  </div>
)

suite
  .add('baseline(1e7-loop)', () => {
    for (let i = 0; i < 1e7; i++) {}
  })
  .add('ReactDOM/simple-dom', () => {
    server(hostDOM)
  })
  .add('RemailRenderer/simple-dom', () => {
    remail(hostDOM)
  })
  .add('ReactDOM/huge-dom', () => {
    server(hugeDOM)
  })
  .add('RemailRenderer/huge-dom', () => {
    remail(hugeDOM)
  })
  .add('ReactDOM/todo-list', () => {
    server(todoList)
  })
  .add('RemailRenderer/todo-list', () => {
    remail(todoList)
  })
  .add('ReactDOM/huge-component', () => {
    server(hugeComponet)
  })
  .add('RemailRenderer/huge-component', () => {
    remail(hugeComponet)
  })
  .on('cycle', function(event: any) {
    console.log(String(event.target));
  })
  .run()
