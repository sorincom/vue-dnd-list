import { DnDList, DnDListItem } from './components'
import { dndSharedState } from './useDnDSharedState'
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
  defaults: {duration: transitionDuration}, //defaults get applied to any "config" object passed to the effect
  extendTimeline: true, //now you can call the effect directly on any GSAP timeline to have the result immediately inserted in the position you define (default is sequenced at the end)
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
  defaults: {duration: transitionDuration}, //defaults get applied to any "config" object passed to the effect
  extendTimeline: true, //now you can call the effect directly on any GSAP timeline to have the result immediately inserted in the position you define (default is sequenced at the end)
});

const DnDListPlugin = {
  install(Vue) {
    Vue.component("DnDList", DnDList)
    Vue.component("DnDListItem", DnDListItem)
  }
}

export {
  DnDListPlugin,
  DnDList,
  DnDListItem,
  dndSharedState
}