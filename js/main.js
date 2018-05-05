import * as THREE from 'libs/threejs/three.min'
import * as OIMO from 'libs/threejs/plugins/oimo.min'

import 'libs/threejs/controls/OrbitControls'

let ctx = canvas.getContext('webgl')

const winWidth = window.innerWidth
const winHeight = window.innerHeight
const cameraAspect = winWidth / winHeight

const length = 20

const bastUrl = 'https://raw.githubusercontent.com/stephenml/wegame-threejs/master/model'

export default class Main {
  constructor() {
    // 场景  
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.PointLight(0x8A8A8A))
    this.scene.add(new THREE.AmbientLight(0xFFFFFF))

    // 摄像机
    this.camera = new THREE.PerspectiveCamera(75, cameraAspect, .1, 1000)
    this.camera.position.z = 30
    this.camera.position.y = 20

    // 渲染器  
    this.renderer = new THREE.WebGLRenderer({ context: ctx, canvas: canvas })
    this.renderer.shadowMap.enabled = true
    this.renderer.setSize(winWidth, winHeight)
    this.renderer.setClearColor(0xFFFFFF, 1)
    // 抗锯齿
    this.renderer.setPixelRatio(window.devicePixelRatio)

    // 摄像机控制器
    this.controls = new THREE.OrbitControls(this.camera)
    this.controls.addEventListener('change', () => {
      this.renderer.render(this.scene, this.camera)
    })

    // Oimo物理世界
    this.world = new OIMO.World({ worldscale: 1 })

    // 初始化
    this.boxs = []
    this.boxBodys = []
    this.models = []
    this.modelBodys = []

    this.start()
  }
  start() {
    // 清除Oimo物理世界
    this.world.clear()

    // 加载材质贴图
    let metal_texture = new THREE.TextureLoader().load("images/metal.jpg")
    let wood_texture = new THREE.TextureLoader().load("images/wood.jpg")
    let cloth_texture = new THREE.TextureLoader().load("images/cloth.jpg")

    // 地面
    let ground_material = new THREE.MeshBasicMaterial({ map: metal_texture })
    this.ground = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 30), ground_material)
    this.ground.receiveShadow = true
    this.ground.castShadow = true
    this.scene.add(this.ground)

    // 物理地面
    this.groundBody = this.world.add({
      size: [30, 1, 30],
      pos: [0, 0, 0],
      name: 'groundBody'
    })

    // 载入json模型
    new THREE.JSONLoader().load(`${bastUrl}/sphere.json`,
      (geometry, materials) => {
        geometry.center()
        // 盒子材质
        let box_meterial = new THREE.MeshLambertMaterial({ map: wood_texture })
        // 模型材质
        let model_meterial = new THREE.MeshLambertMaterial({ map: cloth_texture })

        // 载入模型后再创建盒子
        // 创建盒子和模型
        for (let i = 0; i < length; i++) {
          // 创建盒子
          let box = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), box_meterial)
          box.position.y = 50 + i * 2
          box.receiveShadow = true
          box.castShadow = true
          this.scene.add(box)
          this.boxs.push(box)

          // 创建物理盒子
          let boxBody = this.world.add({
            type: 'box',
            move: true,
            size: [3, 3, 3],
            pos: [0, 50 + i * 2, 0],
            name: `boxBody${i}`
          })
          this.boxBodys.push(boxBody)

          // 创建模型
          let model = new THREE.Mesh(geometry, model_meterial)
          model.scale.set(2, 2, 2)
          model.position.y = 50 + i * 2
          model.receiveShadow = true
          model.castShadow = true
          this.scene.add(model)
          this.models.push(model)

          // 创建物理模型
          let modelBody = this.world.add({
            type: 'sphere',
            move: true,
            size: [2],
            pos: [0, 50 + i * 2, 0],
            name: `modelBody${i}`
          })
          this.modelBodys.push(modelBody)
        }

        // 开启主线程
        this.loop()
      },
      // 进度条 小游戏内无效
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total * 100)}% 已载入`)
      },
      // 载入出错
      (error) => {
        console.log(`载入出错: ${error}`)
      }
    )

  }
  loop() {
    // 更新物理世界
    this.world.step()

    // 复制物理世界的位置到Threejs的网格上
    for (let i = 0; i < length; i++) {
      this.boxs[i].position.copy(this.boxBodys[i].getPosition())
      this.boxs[i].quaternion.copy(this.boxBodys[i].getQuaternion())
      
      this.models[i].position.copy(this.modelBodys[i].getPosition())
      this.models[i].quaternion.copy(this.modelBodys[i].getQuaternion())
    }

    // 碰撞检测
    // if (this.world.checkContact('boxBody', 'modelBody')) {
    //   console.log('contact...')
    // }

    // 渲染
    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(this.loop.bind(this), canvas)
  }
}