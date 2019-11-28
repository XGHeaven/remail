import React from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { List, Row, Grid, Col } from './layout'

describe('components/layout', () => {
  it('should correct render list/row', () => {
    expect(
      render(
        <List>
          <Row>v1</Row>
          <Row>v2</Row>
        </List>,
      ),
    ).toMatchInlineSnapshot(`"<table><tbody><tr><td>v1</td></tr><tr><td>v2</td></tr></tbody></table>"`)
  })

  it('should correct render grid/row/col', () => {
    expect(
      render(
        <Grid>
          <Row>
            <Col>c1</Col>
            <Col>c2</Col>
          </Row>
          <Row>
            <Col>c21</Col>
            <Col>c22</Col>
          </Row>
        </Grid>,
      ),
    ).toMatchInlineSnapshot(
      `"<table><tbody><tr><td>c1</td><td>c2</td></tr><tr><td>c21</td><td>c22</td></tr></tbody></table>"`,
    )
  })

  it('should wrapper row if not under List/Grid', () => {
    expect(render(<Row></Row>)).toMatchInlineSnapshot(`"<table><tbody><tr><td></td></tr></tbody></table>"`)
  })

  it('should wrap with Row for List when parent is List', () => {
    expect(
      render(
        <List>
          <List>
            <Row>v</Row>
          </List>
        </List>,
      ),
    ).toMatchInlineSnapshot(
      `"<table><tbody><tr><td><table><tbody><tr><td>v</td></tr></tbody></table></td></tr></tbody></table>"`,
    )
  })

  it('should wrap with Row/Col for List when parent is Grid', () => {
    expect(
      render(
        <Grid>
          <List>
            <Row>v</Row>
          </List>
        </Grid>,
      ),
    ).toMatchInlineSnapshot(
      `"<table><tbody><tr><td><table><tbody><tr><td>v</td></tr></tbody></table></td></tr></tbody></table>"`,
    )
  })

  it('should wrap with Row for Grid when parent is List', () => {
    expect(
      render(
        <List>
          <Grid>
            <Row>
              <Col>v</Col>
            </Row>
          </Grid>
        </List>,
      ),
    ).toMatchInlineSnapshot(
      `"<table><tbody><tr><td><table><tbody><tr><td>v</td></tr></tbody></table></td></tr></tbody></table>"`,
    )
  })

  it('should wrap with Row/Col for Grid when parent is Grid', () => {
    expect(
      render(
        <Grid>
          <Grid>
            <Row>
              <Col>v</Col>
            </Row>
          </Grid>
        </Grid>,
      ),
    ).toMatchInlineSnapshot(
      `"<table><tbody><tr><td><table><tbody><tr><td>v</td></tr></tbody></table></td></tr></tbody></table>"`,
    )
  })

  it('should wrap with Col for Grid when parent is Grid>Row', () => {
    expect(
      render(
        <Grid>
          <Row>
            <Grid>
              <Row>
                <Col>v</Col>
              </Row>
            </Grid>
          </Row>
        </Grid>,
      ),
    ).toMatchInlineSnapshot(
      `"<table><tbody><tr><td><table><tbody><tr><td>v</td></tr></tbody></table></td></tr></tbody></table>"`,
    )
  })
})
