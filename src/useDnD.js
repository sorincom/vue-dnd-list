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
  const start = (source, data) => {
    _source.value = source
    _data.value = data
  }

  // Method: signal DnD started
  // Provided for usage with other sources than DnDList;
  // It raises the event bus `dnd:dragstart`, in order to
  // allow DnDList listeners to make a copy of list items
  // to be restored in case the drag is cancelled
  const startExternal = (source, data) => {
    _source.value = source
    _data.value = data
    bus.emit('dnd:dragstart', { source })
  }

  const cancelExternal = (source) => {
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
    startExternal,
    cancelExternal,
    end
  }
}

export const dnd = useDnD()