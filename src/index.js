import { DnDList, DnDListItem } from './components'
import { dnd } from './useDnD'
import { dragSourceDirective as  dragsource } from './dragSourceDirective'
import gsap from 'gsap'

const transitionDuration = 0.25

gsap.registerEffect({
  name: "DnDStockOnEnter",
  effect: (targets, config) => {
    return gsap.fromTo(targets, 
      {
        opacity: 0,
        scale: 0.1,
      },
      {
        opacity: 1,
        scale: 1,
        duration: config.duration,
        ease: 'back(1.1)',
        onComplete: config.onComplete
      })
  },
  defaults: {duration: transitionDuration},
  extendTimeline: true,
});

gsap.registerEffect({
  name: "DnDStockOnLeave",
  effect: (targets, config) => {
    return gsap.to(targets, {
      opacity: 0,
      height: 0,
      duration: config.duration,
      ease: 'linear',
      onComplete: config.onComplete
    })
  },
  defaults: {duration: transitionDuration},
  extendTimeline: true,
});

const DnDListPlugin = {
  install(Vue) {
    Vue.component("DnDList", DnDList)
    Vue.component("DnDListItem", DnDListItem)
    Vue.directive('dragsource', dragSourceDirective)
  }
}

export {
  // plugin
  DnDListPlugin,
  // components
  DnDList,
  DnDListItem,
  // shared state
  dnd,
  // v-dragsource directive
  dragsource
}