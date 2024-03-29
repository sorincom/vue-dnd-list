<template>
  <section ref="rootRef" :class="listClass">
    <TransitionGroup
      :css="false"
      @enter="onTransitionEnter"
      @leave="onTransitionLeave">
      <template v-for="(item, index) in items" :key="item">
        <DnDListItem
          :item="item"
          :index="index"
          class="dnd-list-item">
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
import { dnd } from "./useDnD"
import { bus } from './bus'

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
 * This composable handles window-level `dragover` and `drop` events.
 * 
 * It handles `dragover` in order to provide a way to detect when the mouse leaves
 * the list during a drag operation, and to remove the dragged item if it belongs
 * to the list.
 * 
 * It handles `drop` in order to manage some corner cases, such as when the list is
 * empty and something is dropped inside it or when `postDrop` was provided and it
 * needs to be called.
 * 
 * We listen to `dragover` at window level instead of attaching a handler to list
 * container's `dragleave` event because, if the mouse is moved quickly, the `dragleave`
 * event most likely will not trigger. More, even if the mouse moves slowly, the
 * `dragleave` event still doesn't trigger if the list container's content fills the
 * entire viewport (if there are no padding or borders).
 * 
 */
const useWindowDnD = function(props, rootRef, list, acceptsDrop) {

  // Used to know if a dragging operation is happening over this list
  const draggingOverList = ref(false)

  const { isOutside, elementX, elementY } = useMouseInElement(rootRef, { enterDelay: 0, leaveDelay: 0 })

  // When dragging enters the list, maybe emit dnd:dragover item closest
  // to the entry point (gap optimization).
  // When dragging leaves the list, remove the item if the case.
  watch(draggingOverList, (newVal) => {
    if(newVal) {
      props.useGapOptimization && applyGapOptimization()
    }
    else {
      maybeDeleteItem()
    }
  })

  // This function sets the draggingOverList flag during a drag operation
  function onDragOver(evt) {
    evt.preventDefault()
    const rect = rootRef.value.getBoundingClientRect()
    draggingOverList.value =
      evt.clientY >= rect.top &&
      evt.clientY <= rect.bottom &&
      evt.clientX >= rect.left &&
      evt.clientX <= rect.right
  }

  // Only handles special cases, such as when the list is empty or
  // when `postDrop` was provided. Otherwise, the dragged data should
  // have been already managed by bus event handlers.
  function onDrop() {
    const data = dnd.data.value
    if(dnd.source.value != list.value && data && !isOutside.value) {
      // Add the dragged data if the list is empty
      if(!props.items?.length && acceptsDrop.value) {
        props.items?.push(data)
      }
      // Apply post-processing for the dropped item
      if(props.postDrop) {
        props.postDrop(data)
      }
      dnd.end()
    }
    draggingOverList.value = false
  }

  // Handles the case when dragged data enters the container
  // through the gap between items.
  function applyGapOptimization() {
    const el = rootRef.value
    const x = elementX.value
    const y = elementY.value
    // info about the list's layout
    const display = window.getComputedStyle(el).display
    const direction = window.getComputedStyle(el)['flex-direction']
    // scroll position of the list
    const scroll = { y: el.scrollTop, x: el.scrollLeft }
    // compute the closest list item
    let closestIndex = -1
    let smallestDist = Infinity
    props.items?.forEach((_, index) => {
      const kid = el.children[index]
      const kidLeft = kid.offsetLeft - scroll.x
      const kidRight = kidLeft + kid.offsetWidth
      const kidTop = kid.offsetTop - scroll.y
      const kidBottom = kidTop + kid.offsetHeight
      const kidCenter = { x: kidLeft + kid.offsetWidth / 2, y: kidTop + kid.offsetHeight / 2 }
      const isOutside = (x < kidLeft) || (x > kidRight) || (y < kidTop) || (y > kidBottom)
      const dist = isOutside ? Math.sqrt(Math.pow(x - kidCenter.x, 2) + Math.pow(y - kidCenter.y, 2)) : Infinity
      if(dist < smallestDist) {
        smallestDist = dist
        closestIndex = index
        if(display == 'flex' && direction == 'column' && (y > kidCenter.y)) {
          closestIndex += 1
        }
        if(display == 'flex' && direction == 'row' && (x > kidCenter.x)) {
          closestIndex += 1
        }
      }
    })
    if(closestIndex != -1) {
      bus.emit('dnd:dragover', { source: list.value, index: closestIndex })
    }
  }

  function maybeDeleteItem() {
    const data = dnd.data.value
    const shouldDeleteItem = 
      props.items.includes(data)
      // only delete the item if the mouse is outside the list, as we
      // want to keep the item if it's dropped inside it
      && isOutside.value
      // don't delete from the source list, if that list's `copy` prop is true
      && !((list.value == dnd.source.value) && props.copy)
    if(shouldDeleteItem) {
      const index = props.items.indexOf(data)
      props.items.splice(index, 1)
    }
  }

  onBeforeMount(() => {
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("drop", onDrop)
  })

  onBeforeUnmount(() => {
    window.removeEventListener("dragover", onDragOver)
    window.removeEventListener("drop", onDrop)
  })

  return {
    draggingOverList
  }
}

/**
 * This composable handles animations for list items when they enter or
 * leave the list. Default animations are registered in `index.js` as GSAP
 * effects, to be used if the consumer didn't provide custom animations.
 */
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

const useBus = function(props, list, acceptsDrop) {
  // Will be used if the drag operation is canceled, to restore
  // the original list items (aka those before the drag operation started)
  let memItems = [...props.items]

  const forMe = (source) => source == list.value

  // A drag operation started (not necessarily initiated by an
  // item belonging to this list, source list is provided in
  // the payload)
  function onDragStart({source, data}) {
    memItems = [...props.items]
    forMe(source) && dnd.start(source, data)
  }

  // A drag operation happens over a list item (not necessarily 
  // belonging to this list, target list is provided in the payload)
  function onDragOver({source, index}) {

    if(source != list.value) return // not for us

    // The index of the item over which the drag operation is happening
    // const index = props.items.indexOf(payload.data)

    // dnd.data is the dragged data (set by dnd:dragstart)
    // (e.g. the dragged item if the drag operation was started by a DnDList)
    const data = dnd.data.value
    
    // The first (acceptsDrop) condition is self-explanatory.
    // The second (data) condition is to prevent the list from accepting
    // random drops; it will only accept drops from other similar components
    // (DnDList) or from sources that work with the dnd composable.
    if(!acceptsDrop.value || !data) return

    // Dragged data will be immediately moved inside the list (if it's
    // one of list's items) or added to it (if it comes from another source).

    // Dragged data might be one of this list's items (or not)
    const dataIndex = props.items.indexOf(data)

    const shouldMove = 
      props.items.includes(data)
      && dataIndex != index
      && !(dnd.source.value == list.value && props.copy)

    const shouldAdd = !props.items.includes(data)

    if(shouldMove) {
      const oldIndex = dataIndex
      const newIndex = index
      if(oldIndex != newIndex) {
        props.items.splice(oldIndex, 1)
        nextTick(() => props.items.splice(newIndex, 0, data))
      }
    }
    else if(shouldAdd) {
      const insertIndex = index
      props.items.splice(insertIndex, 0, data)
    }
  }

  // A drag operation ended (not necessarily initiated by an
  // item belonging to this list, source list is provided in
  // the payload)
  function onDragEnd({source}) {
    forMe(source) && dnd.end()
  }
  function onDragCancel({source}) {
    // Restore original list items for all lists
    props.items.splice(0, props.items.length, ...memItems)
    forMe(source) && dnd.end()
  }
  onBeforeMount(() => {
    bus.on('dnd:dragstart', onDragStart)
    bus.on('dnd:dragover', onDragOver)
    bus.on('dnd:dragend', onDragEnd)
    bus.on('dnd:cancel', onDragCancel)
  })
  onBeforeUnmount(() => {
    bus.off('dnd:dragstart', onDragStart)
    bus.off('dnd:dragover', onDragOver)
    bus.off('dnd:dragend', onDragEnd)
    bus.off('dnd:cancel', onDragCancel)
  })
}

export default {
  name: 'DnDList',
  components: { DnDListItem },
  props: {
    listId: {
      type: String,
      required: false
    },
    // Whether to accept drop (from anywhere: this list, other lists or any external source).
    // When boolean, it controls whether to accept drop from any source.
    // When string, it will accept drop from a single source, identified by that string.
    // When array, it will accept drop from sources identified by elements of the array.
    accept: {
      type: [String, Boolean, Array],
      default: true,
    },
    // When set, the item will be copied when dragged instead of being moved. Also, the list
    // will reject any dnd op.
    copy: {
      type: Boolean,
      default: false,
    },
    // Items source for this list
    items: {
      type: Array,
      required: true,
    },
    // When false, the item itself will be draggable. When true, the item is not draggable.
    // To use a drag handle, the developer must define a draggable element inside the item
    // template; that element must have the `draggable` attribute set to `true`.
    useHandle: {
      type: Boolean,
      default: false,
    },
    // Optional function to be called after an item is dropped. It receives the dropped
    // item as argument and is basically intended as a mean for the consumer to alter
    // the item's data immediately after it's dropped.
    postDrop: {
      type: Function,
      default: null,
    },
    // Optional custom animation for adding and removing items from the list. If not provided,
    // the default animation will be used. It must be an object with the following structure:
    // {
    //   onEnter: function(el, {onComplete}) { ... },
    //   onLeave: function(el, {onComplete}) { ... },
    // }
    // `el` is the DOM element of the item being animated.
    animation: {
      type: Object,
      default: null,
    },
    // When true, the list will react to dragging through the gap between list items too
    useGapOptimization: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {

    // Unique id for this list
    const list = ref(props.listId ?? randomString())

    // Root ref of this list
    const rootRef = ref(null)

    // Computed acceptsDrop, based on the `accept` prop
    const acceptsDrop = computed(() => {
      if(props.copy) {
        return false
      } else if(props.accept === true) {
        return true
      } else if(props.accept === false) {
        return false
      } else if(Array.isArray(props.accept)) {
        return (dnd.source.value == list.value) || props.accept.includes(dnd.source.value)
      } else {
        return (dnd.source.value == list.value) || (props.accept === dnd.source.value)
      }
    })

    const { draggingOverList } = useWindowDnD(props, rootRef, list, acceptsDrop)

    // Expose to consumers a special CSS class when the list is empty and
    // a drag operation is in progress over it
    const listClass = computed(() => ({
      'dragging-over-when-empty': acceptsDrop.value && draggingOverList.value && props.items.length === 0
    }))

    provide('dnd-draggable', computed(() => !props.useHandle))
    provide('dnd-copy', computed(() => props.copy))
    provide('dnd-list', list)

    // Most dnd operations are implemented by this composable
    useBus(props, list, acceptsDrop)

    return {
      list,
      listClass,
      rootRef,
      ...useAnimation(props),
    }
  }
}
</script>
