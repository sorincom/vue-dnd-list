<template>
  <transition-group
    name="list-container"
    tag="div"
    class="list-container"
    :style="listStyle"
    :class="listClass"
    @drop.prevent="onDrop"
    ref="rootRef"
  >
    <div
      :class="dropZoneClass(0)"
      :style="dropZoneStyle(0)"
      @dragover="handleDragOver({ index: 0, position: 'before' })"
      :key="`${listId}-dropzone-0`" />
    <template v-for="(item, index) in items" :key="keyGeneratorFunc(item)">
      <DnDListItem
        :item="item"
        :index="index"
        :draggable="!useHandle"
        :copyOnDrag="copyOnDrag"
        @dnd:drag-started="handleDragStarted"
        @dnd:drag-over="handleDragOver"
        @dnd:drag-ended="handleDragEnded"
      >
        <slot name="item" :item="item" :index="index"></slot>
      </DnDListItem>
      <div
        :class="dropZoneClass(index + 1)"
        :style="dropZoneStyle(index + 1)"
        @dragover="handleDragOver({ index, position: 'after' })" />
    </template>
  </transition-group>
</template>

<script>
import DnDListItem from "./DnDListItem.vue"
import { dndSharedState } from "./useDnDSharedState"
import { ref, unref, computed, watch, onBeforeMount, onBeforeUnmount } from "vue"

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
 * Handlers for custom events emitted by DnDListItem
 */
const useCustomItemEvents = function(props, listId) {

  const list = unref(listId)
  
  /**
   * One of this list's items has started being dragged
   */
  const handleDragStarted = function({ index, height }) {
    dndSharedState.patch({
      sourceIndex: index,
      sourceList: list,
    })
  }

  /**
   * Something is being dragged over one of this list's items
   * It may be one of list's own items, an item from another list,
   * or something else
   */
  const handleDragOver = function({ index, position }) {
    // Only patch targets if this list accepts drops
    if (props.acceptDrop) {
      dndSharedState.patch({
        targetList: list,
        targetIndex: index,
        targetPosition: position,
      })
    }
  }

  /**
   * Drag ended for one of this list's items.
   * This handler is responsible for removing the
   * item from this list, but only if it was dragged
   * outside the list.
   */
  const handleDragEnded = function({ index }) {
    const doRemove =
      // safety check
      index >= 0 &&
      // remove source item only if the copyOnDrag flag is not set
      !props.copyOnDrag &&
      // only handle cases where drag ended outside this list
      // (if drag ended inside this list, handling is performed by onDrop)
      !dndSharedState.isTarget(list)

    // Remove item from this list if needed
    doRemove && props.items.splice(index, 1)

    // Unconditionnally reset dnd shared state
    dndSharedState.reset()
  }

  return {
    handleDragStarted,
    handleDragEnded,
    handleDragOver,
  }
}

/**
 * This composable has a single job, to provide a way to detect when the mouse
 * leaves the list container, during a drag operation.
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
const useDragLeaveSubstitute = function(rootRef) {

  // Used to know if a dragging operation is happening over this list
  const draggingOverList = ref(false)

  // When dragging leaves the list, clear shared state's drop target
  watch(draggingOverList, (value) => {
    if (!value) {
      dndSharedState.clearTarget()
    }
  },
  { immediate: true })

  // Check if dragging happens over this list and set the draggingOverList
  // flag accordingly
  function dragOverWindow(evt) {
    evt.preventDefault()
    const rect = rootRef.value.$el.getBoundingClientRect()
    draggingOverList.value =
      evt.clientY >= rect.top &&
      evt.clientY <= rect.bottom &&
      evt.clientX >= rect.left &&
      evt.clientX <= rect.right
  }

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

/**
 * Drop zones are zones between list items where a dragged item can be dropped.
 * A list with N items has N+1 drop zones (before the first item, betweeen each
 * two adjacent items and after the last item).
 */
const useDropZones = function(props, listId) {

  const list = unref(listId)

  /**
   * Returns the index of the drop zone closest to the mouse position during a
   * drag operation happening over this list.
   * Shared state's values are updated by the custom item events handlers. This
   * is merely a helper that computes the closest drop zone based on shared state's
   * values.
   */
  const dropZoneIndex = computed(() => {
    if (dndSharedState.isTarget(list)) {
      return dndSharedState.targetPosition.value == "before"
        ? dndSharedState.targetIndex.value
        : dndSharedState.targetPosition.value == "after"
          ? dndSharedState.targetIndex.value + 1
          : null
    } else {
      return null
    }
  })

  function dropZoneClass(index) {
    return {
      "drop-zone": true,
      active: dropZoneIndex.value == index
    }
  }

  function dropZoneStyle(index) {
    const isCurrent = index == dropZoneIndex.value
    const style = {}
    if(props.dropZoneCustomStyle && isCurrent) {
      Object.assign(style, props.dropZoneCustomStyle)
    }
    return style
  }

  return {
    dropZoneIndex,
    dropZoneClass,
    dropZoneStyle
  }
}

/**
 * Handler for list's `drop` event.
 */
const useDropEvent = function(props, listId, dropZoneIndex) {

  const list = unref(listId)

  function moveItem(oldIndex, newIndex) {
    // Move item inside this list
    const item = props.items.splice(oldIndex, 1)[0]
    const insertIndex = newIndex > oldIndex ? newIndex - 1 : newIndex
    props.items.splice(insertIndex, 0, item)
  }

  function addItem(item, index) {
    // Add new item to this list
    props.items.splice(index, 0, item)
  }

  function onDrop(evt) {
    if (props.acceptDrop) {
      if (dndSharedState.isSource(list)) {
        // Dragging happened within this list.
        // Depending on the copyOnDrag prop, we either copy the item or move it.
        if (props.copyOnDrag) {
          const copyItem = JSON.parse(
            JSON.stringify(props.items[dndSharedState.sourceIndex.value])
          )
          if (props.itemIdGeneratorFunc) {
            copyItem.id = props.itemIdGeneratorFunc(copyItem)
          }
          addItem(copyItem, dropZoneIndex.value)
        } else {
          moveItem(dndSharedState.sourceIndex.value, dropZoneIndex.value)
        }
      } else {
        // Item is external to this list
        const droppedItem = JSON.parse(evt.dataTransfer.getData("item"))
        if (props.itemIdGeneratorFunc) {
          droppedItem.id = props.itemIdGeneratorFunc(droppedItem)
        }
        addItem(droppedItem, dropZoneIndex.value)
      }
    }
    if (!dndSharedState.isSource(list)) {
      // handleDragEnded will not trigger, so we must do the cleanup here
      dndSharedState.clearTarget()
    }
  }

  return {
    onDrop
  }
}

export default {
  name: "DnDList",
  components: { DnDListItem },
  props: {
    /**
     * Whether to accept drop (from anywhere: this list, other lists or any external source).
     */
    acceptDrop: {
      type: Boolean,
      default: true,
    },
    /**
     * When set, the item will be copied when dragged instead of being moved.
     */
    copyOnDrag: {
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
    /**
     * Custom style for the drop zone (when active)
     */
    dropZoneCustomStyle: {
      type: Object,
      default: null,
    },
    /**
     * Optional function to generate the key for the list item. The function should accept
     * the item as parameter.
     * By default, the item id is used.
     */
    keyGeneratorFunc: {
      type: Function,
      default: function (item) {
        return item?.id
      },
    },
    /**
     * Optional function to generate the id for the list item. The function should accept
     * the item as parameter.
     * By default, the item id is used. Not called when moving items inside the list
     */
    itemIdGeneratorFunc: {
      type: Function,
      default: function (item) {
        return item?.id
      },
    },
  },
  setup(props) {

    // Unique id for this list
    const listId = ref(randomString())

    // Root ref of this list
    const rootRef = ref(null)

    const { draggingOverList } = useDragLeaveSubstitute(rootRef)

    const { dropZoneIndex, dropZoneClass, dropZoneStyle } = useDropZones(props, listId)

    const listStyle = computed(() => {
      const style = {}
      if(props.gap) {
        style.gap = props.gap
      }
      return style
    })

    const listClass = computed(() => ({
      'list-container': true,
      'dragging-over-when-empty': draggingOverList.value && props.items.length === 0
    }))

    return {
      listId,
      listClass,
      listStyle,
      rootRef,
      ...useCustomItemEvents(props, listId),
      dropZoneIndex,
      dropZoneClass,
      dropZoneStyle,
      ...useDropEvent(props, listId, dropZoneIndex)
    }
  }
}
</script>

<style scoped lang="scss">

.list-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
  &.dragging-over-when-empty {
    border: 2px dashed rgba(0,0,0,0.4);
  }
}

.list-container-move, /* apply transition to moving elements */
.list-container-enter-active,
.list-container-leave-active {
  transition: all 0.15s ease-in-out;
}

.list-container-enter-from,
.list-container-leave-to {
  opacity: 0;
  // transform: translateX(-300px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-container-leave-active {
  position: absolute;
}

$transition-duration: 0.125s;
$transition-curve: ease-in-out;
$dropZoneHeight: 8px;
$opacity: 0.4;

.drop-zone {
  background-color: green;
  box-sizing: border-box;
  opacity: 0;
  height: 0;
  transition: all $transition-duration $transition-curve;
  &.active {
    min-height: $dropZoneHeight;
    max-height: $dropZoneHeight;
    opacity: $opacity;
    transition: all $transition-duration $transition-curve;
  }
}

</style>