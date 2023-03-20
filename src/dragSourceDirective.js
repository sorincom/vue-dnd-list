import { dnd } from './useDnD'

export const dragSourceDirective = {
  beforeMount(el, binding) {
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
    el.ctlDragStart.abort()
    el.ctlDragEnd.abort()
  }
}