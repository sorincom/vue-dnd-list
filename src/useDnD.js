import { ref, computed } from 'vue'

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
  const start = (source, data) => {
    _source.value = source
    _data.value = data
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
    end
  }
}

export const dnd = useDnD()