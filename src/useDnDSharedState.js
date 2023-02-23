import { ref } from 'vue'

function useDnDSharedState() {

  const sourceList = ref(null)
  const targetList = ref(null)
  const sourceIndex = ref(null)
  const targetIndex = ref(null)
  const targetPosition = ref(null)

  // Function for patching state
  const patch = (state) => {
    if(!state) return
    if(state.hasOwnProperty('sourceList')) {
      sourceList.value = state.sourceList
    }
    if(state.hasOwnProperty('targetList')) {
      targetList.value = state.targetList
    }
    if(state.hasOwnProperty('sourceIndex')) {
      sourceIndex.value = state.sourceIndex
    }
    if(state.hasOwnProperty('targetIndex')) {
      targetIndex.value = state.targetIndex
    }
    if(state.hasOwnProperty('targetPosition')) {
      targetPosition.value = state.targetPosition
    }
  }

  const reset = () => {
    sourceList.value = null
    targetList.value = null
    sourceIndex.value = null
    targetIndex.value = null
    targetPosition.value = null
  }

  const clearTarget = () => {
    targetList.value = null
    targetIndex.value = null
    targetPosition.value = null
  }

  const log = (message) => {
    console.log('dndSharedState', message, {
      sourceList: sourceList.value,
      targetList: targetList.value,
      sourceIndex: sourceIndex.value,
      targetIndex: targetIndex.value,
      targetPosition: targetPosition.value,
    })
  }

  return {
    sourceList,
    targetList,
    sourceIndex,
    targetIndex,
    targetPosition,
    patch,
    reset,
    clearTarget,
    isSource: (list) => sourceList.value === list,
    isTarget: (list) => targetList.value === list,
    log
  }
}

export const dndSharedState = useDnDSharedState()