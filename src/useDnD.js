import { ref, computed } from 'vue'
import { bus } from './bus'

// Maintains shared state for the drag and drop functionality
function useDnD() {

  // State: source for dragged data
  const _source = ref(null)

  // State: dragged data
  const _data = ref(null)

  // Computed: state as json
  const asJson = computed(() => {
    return JSON.stringify({
      source: _source.value,
      data: _data.value
    }, null, 2)
  })

  // Method: signal DnD started
  // Used internally by DnDList
  const start = (source, data, busEmit = false) => {
    _source.value = source
    _data.value = data

    // The busEmit parameter is used only by the `dragsource` directive,
    // allowing other components than DnDListItem to signal a drag started
    busEmit && bus.emit('dnd:dragstart', { source })
  }

  const cancel = (source) => {
    bus.emit('dnd:cancel', { source })
    end()
  }

  // Method: signal DnD ended
  const end = () => {
    _source.value = null
    _data.value = null
  }

  return {
    source: _source,
    data: _data,
    asJson,
    start,
    end,
    cancel
  }
}

export const dnd = useDnD()