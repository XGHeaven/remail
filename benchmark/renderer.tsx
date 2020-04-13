import React, { Fragment, createContext, useContext, useState } from 'react'
import { Suite } from 'benchmark'

import { renderToString as server } from 'react-dom/server'
import { renderToString as remail } from '../packages/renderer'

const suite = new Suite()

const hostDOM = (
  <div>
    <header>This is a header</header>
    <button>Click</button>
  </div>
)

const hostText = <Fragment>here is a text</Fragment>

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

suite
  .add('ReactDOM/host-dom', () => {
    server(hostDOM)
  })
  .add('RemailRenderer/host-dom', () => {
    remail(hostDOM)
  })
  .add('ReactDOM/host-text', () => {
    server(hostText)
  })
  .add('RemailRenderer/host-text', () => {
    remail(hostText)
  })
  .add('ReactDOM/todo-list', () => {
    server(todoList)
  })
  .add('RemailRenderer/todo-list', () => {
    remail(todoList)
  })
  .on('cycle', function(event: any) {
    console.log(String(event.target));
  })
  .on('complete', function(this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run()
