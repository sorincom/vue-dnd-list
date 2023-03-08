import { DnDList, DnDListItem } from './components'
import { dndSharedState } from './useDnDSharedState'
import gsap from 'gsap'


const transitionDuration = 0.5

gsap.registerEffect({
  name: "ScaleSlideAndAppear",
  effect: (targets, config) => {
    return gsap.fromTo(targets, 
      {
        opacity: 0,
        y: "-=4"
      },
      {
        opacity: 1,
        y: 0,
        duration: config.duration,
        ease: 'power4.out',
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