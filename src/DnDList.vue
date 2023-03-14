<template>
  <section ref="rootRef" :class="listClass" @drop.prevent="onDrop" :data-list="list">
    <TransitionGroup
      :css="false"
      @enter="onTransitionEnter"
      @leave="onTransitionLeave">
      <template v-for="(item, index) in items" :key="item">
        <DnDListItem
          :item="item"
          :index="index"
          class="dnd-list-item"
          @dnd:drag-started="handleDragStarted"
          @dnd:drag-over="handleDragOver">
          <slot name="item" :item="item" :index="index"></slot>
        </DnDListItem>
      </template>
    </TransitionGroup>
  </section>
</template>

<script>

import { ref, computed, watch, nextTick, provide, onBeforeMount, onBeforeUnmount } from "vue"
import { useMouseInElement } from '@vueuse/core'
import gsap from 'gsap'
import DnDListItem from "./DnDListItem.vue"
import { dndSharedState } from "./useDnDSharedState"

function randomString() {
  const length = 8
  const pool = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const chars = new Array(length)
  const randomValues = new Uint32Array(length)

  window.crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    chars[i] = pool[randomValues[i] % pool.length]
  }

  return chars.join('')
}

/**
 * Handlers for custom events emitted by list items
 */
const useCustomItemEvents = function(props, list, acceptsDrop) {

  // One of this list's items has started being dragged
  const handleDragStarted = function({ index }) {
    const sourceItem = props.items[index]
    const draggedItem = props.copy ? JSON.parse(JSON.stringify(sourceItem)) : sourceItem
    dndSharedState.patch({
      draggedItem,
      sourceList: list.value
    })
  }

  // Something is being dragged over one of this list's items
  // It may be one of list's own items, an item from another list,
  // or something else
  const handleDragOver = function({ index }) {
    
    if(!acceptsDrop.value) return

    const draggedItem = dndSharedState.draggedItem.value

    const draggedItemIndex = props.items.indexOf(draggedItem)

    const shouldMoveItemInsideList = 
      props.items.includes(draggedItem)
      && draggedItemIndex != index
      && !(dndSharedState.sourceList.value == list.value && props.copy)

    const shouldAddItemToList = !props.items.includes(draggedItem)

    if(shouldMoveItemInsideList) {
      const oldIndex = props.items.indexOf(draggedItem)
      const newIndex = index
      if(oldIndex != newIndex) {
        props.items.splice(oldIndex, 1)
        nextTick(() => props.items.splice(newIndex, 0, draggedItem))
      }
    }
    else if(shouldAddItemToList) {
      const insertIndex = index
      props.items.splice(insertIndex, 0, draggedItem)
    }
  }

  return {
    handleDragStarted,
    handleDragOver,
  }
}

/**
 * This composable has a single job, to provide a way to detect when the mouse
 * leaves the list container, during a drag operation, and to remove the dragged
 * item if it's part of list's items.
 * 
 * We will listen to window events instead of attaching a handler to list container's 
 * `dragleave` event because, if the mouse is moved quickly, the `dragleave` event 
 * most likely will not trigger. More, even if the mouse moves slowly, the
 * `dragleave` event still doesn't trigger if the list container's content fills the 
 * entire viewport (if there are no padding or borders).
 * 
 * Therefore, we catch the `dragover` event at window level and use it to detect if 
 * the mouse is over the list.
 */
const useWindowDragOver = function(props, rootRef, list) {

  // Used to know if a dragging operation is happening over this list
  const draggingOverList = ref(false)

  const { isOutside } = useMouseInElement(rootRef, { enterDelay: 0, leaveDelay: 0 })

  // When dragging leaves the list, clear shared state's drop target
  watch(draggingOverList, (newVal) => {
    if (!newVal) {
      const draggedItem = dndSharedState.draggedItem.value
      const shouldDeleteItem = 
        props.items.includes(draggedItem)
        // only delete the item if the mouse is outside the list, as the
        // draggingOverList flag is also set to false by the drop event
        // (and we want to keep the item in the list if it's dropped)
        && isOutside.value
        // don't delete from the source list, if that list's `copy` prop is true
        && !((list.value == dndSharedState.sourceList.value) && props.copy)
      if(shouldDeleteItem) {
        const index = props.items.indexOf(draggedItem)
        props.items.splice(index, 1)
      }
    }
  })

  // This function sets the draggingOverList flag during a drag operation
  function dragOverWindow(evt) {
    evt.preventDefault()
    const rect = rootRef.value.getBoundingClientRect()
    draggingOverList.value =
      evt.clientY >= rect.top &&
      evt.clientY <= rect.bottom &&
      evt.clientX >= rect.left &&
      evt.clientX <= rect.right
  }

  // And this one clears it when the drag operation ends
  function dragEndWindow() {
    draggingOverList.value = false
  }

  onBeforeMount(() => {
    window.addEventListener("dragover", dragOverWindow)
    window.addEventListener("dragend", dragEndWindow)
  })

  onBeforeUnmount(() => {
    window.removeEventListener("dragover", dragOverWindow)
    window.removeEventListener("dragend", dragEndWindow)
  })

  return {
    draggingOverList
  }
}

const useAnimation = function(props) {
  return {
    onTransitionEnter: function (el, done) {
      if(props.animation?.onEnter) {
        props.animation.onEnter(el, { onComplete: done })
      } else {
        gsap.effects.DnDStockOnEnter(el, { onComplete: done })
      }
    },
    onTransitionLeave: function (el, done) {
      if(props.animation?.onLeave) {
        props.animation.onLeave(el, { onComplete: done })
      } else {
        gsap.effects.DnDStockOnLeave(el, { onComplete: done })
      }
    },
  }
}

export default {
  name: "DnDList",
  components: { DnDListItem },
  props: {
    listId: {
      type: String,
      required: false,
    },
    horizontal: {
      type: Boolean,
      default: false,
    },
    // Whether to accept drop (from anywhere: this list, other lists or any external source).
    // When boolean, it controls whether to accept drop from any source.
    // When string, it will accept drop from a single source, identified by that string.
    // When array, it will accept drop from sources identified by elements of the array.
    accept: {
      type: [String, Boolean, Array],
      default: true,
    },
    // When set, the item will be copied when dragged instead of being moved.
    copy: {
      type: Boolean,
      default: false,
    },
    /**
     * Items source for this list
     */
    items: {
      type: Array,
      required: true,
    },
    /**
     * When false, the item itself will be draggable. When true, the item is not draggable.
     * To use a drag handle, the developer must define a draggable element inside the item
     * template; that element must have the `draggable` attribute set to `true` and its style
     * must define `pointer-events: all;`.
     */
    useHandle: {
      type: Boolean,
      default: false,
    },
    /**
     * The gap between list items ass CSS string (e.g. "10px" or "1rem")
     */
    gap: {
      type: String,
      default: null,
    },
    postDrop: {
      type: Function,
      default: null,
    },
    animation: {
      type: Object,
      default: null,
    },
  },
  setup(props) {

    // Unique id for this list
    const list = ref(props.listId || randomString())

    // Root ref of this list
    const rootRef = ref(null)

    const { draggingOverList } = useWindowDragOver(props, rootRef, list)

    watch(() => props.copy, (newVal) => {
      if(newVal && props.accept) {
        console.warn('The `copy` and `accept` props for the DnDList component should not be both true at the same time.')
      }
    })

    const listClass = computed(() => ({
      'dragging-over-when-empty': acceptsDrop.value && draggingOverList.value && props.items.length === 0
    }))

    const acceptsDrop = computed(() => {
      if(props.accept === true) {
        return true
      } else if(props.accept === false) {
        return false
      } else if(Array.isArray(props.accept)) {
        return (dndSharedState.sourceList.value == list.value) || props.accept.includes(dndSharedState.sourceList.value)
      } else {
        return (dndSharedState.sourceList.value == list.value) || (props.accept === dndSharedState.sourceList.value)
      }
    })

    function onDrop() {
      const draggedItem = dndSharedState.draggedItem.value

      // Custom item events would not fire in this case
      // Add the dragged item here
      if(!props.items?.length && acceptsDrop.value) {
        props.items?.push(draggedItem)
        dndSharedState.patch({ operation: 'add' })
      }

      // Apply post-processing for the dropped item
      if(props.postDrop) {
        props.postDrop(draggedItem)
      }

      // Reset the shared state
      dndSharedState.reset()
    }

    provide('dnd-draggable', !props.useHandle)
    provide('dnd-copy', props.copy)
    provide('dnd-horizontal', props.horizontal)

    return {
      list,
      listClass,
      rootRef,
      ...useCustomItemEvents(props, list, acceptsDrop),
      ...useAnimation(props),
      onDrop
    }
  }
}
</script>
