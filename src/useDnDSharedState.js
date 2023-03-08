import { ref, computed } from 'vue'

// Maintains shared state for the drag and drop functionality
function useDnDSharedState() {

  // State: source list for dragged item, if any
  const sourceList = ref(null)

  // State: the item being dragged
  const draggedItem = ref(null)

  // Mutation: method for patching state
  const patch = (state) => {
    if(!state) return
    if(state.hasOwnProperty('sourceList')) {
      sourceList.value = state.sourceList
    }
    if(state.hasOwnProperty('draggedItem')) {
      draggedItem.value = state.draggedItem
    }
  }

  // Mutation: reset state
  const reset = () => {
    sourceList.value = null
    draggedItem.value = null
  }

  // Computed: state as json
  const asJson = computed(() => {
    return JSON.stringify({
      sourceList: sourceList.value,
      draggedItem: draggedItem.value
    }, null, 2)
  })

  return {
    sourceList,
    draggedItem,
    asJson,
    patch,
    reset
  }
}

export const dndSharedState = useDnDSharedState()