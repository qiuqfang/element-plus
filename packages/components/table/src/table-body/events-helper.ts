// @ts-nocheck
import { h, inject, ref } from 'vue'
import { debounce } from 'lodash-unified'
import { hasClass } from '@element-plus/utils'
import { useZIndex } from '@element-plus/hooks'
import { createTablePopper, getCell, getColumnByCell } from '../util'
import { TABLE_INJECTION_KEY } from '../tokens'
import type { TableColumnCtx } from '../table-column/defaults'
import type { TableBodyProps } from './defaults'
import type { TableOverflowTooltipOptions } from '../util'

function useEvents<T>(props: Partial<TableBodyProps<T>>) {
  const parent = inject(TABLE_INJECTION_KEY)
  const tooltipContent = ref('')
  const tooltipTrigger = ref(h('div'))
  const { nextZIndex } = useZIndex()
  const handleEvent = (event: Event, row: T, name: string) => {
    const table = parent
    const cell = getCell(event)
    let column: TableColumnCtx<T>
    const namespace = table?.vnode.el?.dataset.prefix
    if (cell) {
      column = getColumnByCell(
        {
          columns: props.store.states.columns.value,
        },
        cell,
        namespace
      )
      if (column) {
        table?.emit(`cell-${name}`, row, column, cell, event)
      }
    }
    table?.emit(`row-${name}`, row, column, event)
  }
  const handleDoubleClick = (event: Event, row: T) => {
    handleEvent(event, row, 'dblclick')
  }
  const handleClick = (event: Event, row: T) => {
    props.store.commit('setCurrentRow', row)
    handleEvent(event, row, 'click')
  }
  const handleContextMenu = (event: Event, row: T) => {
    handleEvent(event, row, 'contextmenu')
  }
  const handleMouseEnter = debounce((index: number) => {
    props.store.commit('setHoverRow', index)
  }, 30)
  const handleMouseLeave = debounce(() => {
    props.store.commit('setHoverRow', null)
  }, 30)
  const getPadding = (el: HTMLElement) => {
    const style = window.getComputedStyle(el, null)
    const paddingLeft = Number.parseInt(style.paddingLeft, 10) || 0
    const paddingRight = Number.parseInt(style.paddingRight, 10) || 0
    const paddingTop = Number.parseInt(style.paddingTop, 10) || 0
    const paddingBottom = Number.parseInt(style.paddingBottom, 10) || 0
    return {
      left: paddingLeft,
      right: paddingRight,
      top: paddingTop,
      bottom: paddingBottom,
    }
  }
  const handleCellMouseEnter = (
    event: MouseEvent,
    row: T,
    tooltipOptions: TableOverflowTooltipOptions
  ) => {
    const table = parent
    const cell = getCell(event)
    const namespace = table?.vnode.el?.dataset.prefix
    if (cell) {
      const column = getColumnByCell(
        {
          columns: props.store.states.columns.value,
        },
        cell,
        namespace
      )
      const hoverState = (table.hoverState = { cell, column, row })
      table?.emit(
        'cell-mouse-enter',
        hoverState.row,
        hoverState.column,
        hoverState.cell,
        event
      )
    }

    if (!tooltipOptions) {
      return
    }

    // 判断是否text-overflow, 如果是就显示tooltip
    const cellChild = (event.target as HTMLElement).querySelector(
      '.cell'
    ) as HTMLElement
    if (
      !(
        hasClass(cellChild, `${namespace}-tooltip`) &&
        cellChild.childNodes.length
      )
    ) {
      return
    }
    // use range width instead of scrollWidth to determine whether the text is overflowing
    // to address a potential FireFox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1074543#c3
    const range = document.createRange()
    range.setStart(cellChild, 0)
    range.setEnd(cellChild, cellChild.childNodes.length)
    /** detail: https://github.com/element-plus/element-plus/issues/10790
     *  What went wrong?
     *  UI > Browser > Zoom, In Blink/WebKit, getBoundingClientRect() sometimes returns inexact values, probably due to lost precision during internal calculations. In the example above:
     *    - Expected: 188
     *    - Actual: 188.00000762939453
     */
    const rangeWidth = Math.round(range.getBoundingClientRect().width)
    const rangeHeight = Math.round(range.getBoundingClientRect().height)
    const { top, left, right, bottom } = getPadding(cellChild)
    const horizontalPadding = left + right
    const verticalPadding = top + bottom
    if (
      rangeWidth + horizontalPadding > cellChild.offsetWidth ||
      rangeHeight + verticalPadding > cellChild.offsetHeight ||
      cellChild.scrollWidth > cellChild.offsetWidth
    ) {
      createTablePopper(
        parent?.refs.tableWrapper,
        cell,
        cell.innerText || cell.textContent,
        nextZIndex,
        tooltipOptions
      )
    }
  }
  const handleCellMouseLeave = (event) => {
    const cell = getCell(event)
    if (!cell) return

    const oldHoverState = parent?.hoverState
    parent?.emit(
      'cell-mouse-leave',
      oldHoverState?.row,
      oldHoverState?.column,
      oldHoverState?.cell,
      event
    )
  }

  return {
    handleDoubleClick,
    handleClick,
    handleContextMenu,
    handleMouseEnter,
    handleMouseLeave,
    handleCellMouseEnter,
    handleCellMouseLeave,
    tooltipContent,
    tooltipTrigger,
  }
}

export default useEvents
