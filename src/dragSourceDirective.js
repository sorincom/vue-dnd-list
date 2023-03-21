import { dnd } from './useDnD'

/**
 * Directive for making an element draggable and able to work
 * with the DnDList component.
 * 1. It adds the `draggable` attribute to the element
 * 2. It adds a `dragstart` event listener to the element,
 *    which sets the dnd shared state and emits a `dnd:dragstart`
 *    event on the bus.
 * 3. It adds a `dragend` event listener to the element
 *    which:
 *    - signals a `dnd:cancel` event on the bus if the drag
 *      operation was canceled.
 *    - clears the dnd shared state
 * 
 * This directive is intended for use with independent elements
 * or components, to make them able to work with the DnDList.
 */
export const dragSourceDirective = {
  beforeMount(el, binding) {
    // `draggable` attribute and `dragstart` event listener
    (function() {
      const controller = new AbortController();
      const { signal } = controller;
      el.addEventListener('dragstart', (evt) => {
        evt.dataTransfer.dropEffect = 'copy'
        evt.dataTransfer.effectAllowed = 'copy'
        try {
          let { source, data } = binding.value
          // always make a copy of the data to be dragged
          data = JSON.parse(JSON.stringify(data))
          dnd.start(source, data, true)
        } catch (err) {
          console.error(err)
        }
      }, { signal })
      el.setAttribute('draggable', true)
      el.ctlDragStart = controller
    })();

    // `dragend` event listener
    (function() {
      const controller = new AbortController();
      const { signal } = controller;
      el.addEventListener('dragend', (evt) => {
        if(evt.dataTransfer.dropEffect == 'none') {
          dnd.cancel(binding.value.source)
        } else {
          dnd.end()
        }
      }, { signal })
      el.ctlDragEnd = controller
    })();
    
  },
  beforeUnmount(el) {
    // Clear event listeners
    el.ctlDragStart.abort()
    el.ctlDragEnd.abort()
  }
}