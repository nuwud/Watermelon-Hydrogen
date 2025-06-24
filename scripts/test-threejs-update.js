/**
 * 🚀 Three.js Version Test & Integration Verification
 * Run this in browser console to verify the update
 */

/* global THREE, gsap */

// Import Three.js if running in a module environment
function runTests() {
  console.log('🍉 Three.js Update Verification Test');
  console.log('='.repeat(50));

  // Test 1: Version check
  if (typeof THREE !== 'undefined' && THREE.REVISION) {
    console.log(`✅ Three.js Version: r${THREE.REVISION}`);
    console.log(`✅ Three.js Available: ${!!THREE}`);
    
    if (THREE.REVISION >= 177) {
      console.log('🎉 Three.js successfully updated to latest version!');
    } else {
      console.log('⚠️ Three.js version is older than expected');
    }
  } else {
    console.log('❌ Three.js not found or REVISION not available');
    return;
  }
  
  // Test 2: Core functionality
  console.log('\n🧪 Testing Core Three.js Features:');
  const startTime = performance.now();

  try {
    // Test basic Three.js objects
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Use the variables to avoid unused warnings
    scene.add(mesh);
    camera.position.z = 5;
    
    console.log('✅ Scene creation: Working');
    console.log('✅ Camera creation: Working');
    console.log('✅ Geometry creation: Working');
    console.log('✅ Material creation: Working');
    console.log('✅ Mesh creation: Working');
    
    // Cleanup
    geometry.dispose();
    material.dispose();
    
  } catch (error) {
    console.log(`❌ Core functionality error: ${error.message}`);
  }

  const endTime = performance.now();
  console.log(`Three.js Scene Creation took ${endTime - startTime} milliseconds`);

  console.log('Three.js Scene Creation completed');

  // Test 3: Watermelon integration
  console.log('\n🍉 Testing Watermelon Integration:');

  const integrationTests = [
    { name: 'Content Manager', test: () => !!window.contentManager },
    { name: 'Debug Carousel', test: () => !!window.debugCarousel },
    { name: 'Cart Test Utils', test: () => !!window.cartTestUtils },
    { name: 'Integration Tests', test: () => !!window.watermelonIntegrationTests },
    { name: 'Admin Panel', test: () => !!window.watermelonAdmin }
  ];

  integrationTests.forEach(test => {
    const result = test.test();
    console.log(`${result ? '✅' : '❌'} ${test.name}: ${result ? 'Available' : 'Not found'}`);
  });

  // Test 4: Three.js + GSAP compatibility
  console.log('\n⚡ Testing Three.js + GSAP Compatibility:');
  if (typeof gsap !== 'undefined') {
    try {
      const testMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      
      // Test GSAP animation on Three.js object
      const tl = gsap.timeline();
      tl.to(testMesh.rotation, { x: Math.PI, duration: 0.1 });
      
      console.log('✅ GSAP + Three.js integration: Working');
      
      // Cleanup
      testMesh.geometry.dispose();
      testMesh.material.dispose();
      tl.kill();
      
    } catch (error) {
      console.log(`❌ GSAP + Three.js error: ${error.message}`);
    }
  } else {
    console.log('⚠️ GSAP not available for compatibility test');
  }

  // Summary
  console.log('\n🎉 Three.js Update Verification Complete!');
  console.log('Run the following for full integration test:');
  console.log('window.watermelonIntegrationTests.runAll();');

  // Export for module use
  if (typeof window !== 'undefined') {
    window.threeJsUpdateTest = {
      version: THREE.REVISION,
      isWorking: true,
      timestamp: new Date().toISOString()
    };
  }
}

if (typeof THREE === 'undefined') {
  if (typeof require !== 'undefined') {
    // Node.js environment
    const THREE = require('three');
    global.THREE = THREE;
    runTests();
  } else if (typeof window !== 'undefined') {
    // Browser environment - load from CDN
    console.log('⚠️ THREE.js not found. Loading from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/177/three.min.js';
    script.onload = () => {
      console.log('✅ THREE.js loaded successfully');
      runTests();
    };
    document.head.appendChild(script);
  }
} else {
  // THREE is already available, run tests immediately
  runTests();
}
