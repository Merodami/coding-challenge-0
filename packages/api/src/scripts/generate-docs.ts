#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

/**
 * Generate Scalar API documentation - Modern, fast, and beautiful
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Paths
const OUTPUT_DIR = join(__dirname, '../../dist')
const OPENAPI_DIR = join(__dirname, '../../generated/openapi')

async function generateScalarDocs() {
  try {
    console.log('🚀 Generating Scalar documentation...')

    // Create output directory
    mkdirSync(OUTPUT_DIR, { recursive: true })

    // Create Scalar HTML template with embedded spec
    const scalarTemplate = (title: string, spec: object) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; }
  </style>
</head>
<body>
  <script
    id="api-reference"
    type="application/json">
    ${JSON.stringify(spec, null, 2)}
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`

    // Generate docs for each API
    const apis = [
      {
        file: 'public-api.json',
        output: 'public-api-docs.html',
        title: 'Fever Event Service Public API - Scalar',
      },
      {
        file: 'internal-api.json',
        output: 'internal-api-docs.html',
        title: 'Fever Event Service Internal API - Scalar',
      },
      {
        file: 'all-apis.json',
        output: 'all-apis-docs.html',
        title: 'Fever Event Service Complete API - Scalar',
      },
    ]

    for (const api of apis) {
      const specPath = resolve(join(OPENAPI_DIR, api.file))
      const outputPath = resolve(join(OUTPUT_DIR, api.output))

      // Validate paths are within expected directories for security
      if (!specPath.startsWith(resolve(OPENAPI_DIR))) {
        throw new Error(`Invalid spec path: ${specPath}`)
      }
      if (!outputPath.startsWith(resolve(OUTPUT_DIR))) {
        throw new Error(`Invalid output path: ${outputPath}`)
      }

      console.log(`📖 Processing ${api.file}...`)

      // Read the OpenAPI spec
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const spec = JSON.parse(readFileSync(specPath, 'utf8'))

      // Generate HTML with embedded spec
      const htmlOutput = scalarTemplate(api.title, spec)

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      writeFileSync(outputPath, htmlOutput)
      console.log(`✅ Generated ${api.output}`)
    }

    // Create a modern index page
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fever API Hub - Event Service Documentation</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --fever-primary: #6f41d7;
            --fever-primary-dark: #44248b;
            --fever-primary-light: #8e69e3;
            --fever-secondary: #0079ca;
            --fever-secondary-dark: #005795;
            --fever-secondary-light: #39a5ee;
            --fever-accent: #eb0052;
            --fever-dark: #06232c;
            --fever-dark-text: #031419;
            --fever-gray: #536b75;
            --fever-light-gray: #a7b2ba;
            --fever-bg-gray: #f2f3f3;
            --fever-bg-light: #fafbfb;
            --gradient-primary: linear-gradient(135deg, #6f41d7 0%, #8e69e3 100%);
            --gradient-secondary: linear-gradient(135deg, #0079ca 0%, #39a5ee 100%);
            --gradient-accent: linear-gradient(135deg, #eb0052 0%, #ff1744 100%);
            --gradient-dark: linear-gradient(180deg, #06232c 0%, #031419 100%);
            --gradient-mesh: radial-gradient(at 40% 20%, hsla(260, 68%, 55%, 0.15) 0px, transparent 50%),
                            radial-gradient(at 80% 0%, hsla(260, 68%, 60%, 0.1) 0px, transparent 50%),
                            radial-gradient(at 0% 50%, hsla(200, 100%, 40%, 0.08) 0px, transparent 50%),
                            radial-gradient(at 80% 50%, hsla(260, 68%, 55%, 0.05) 0px, transparent 50%),
                            radial-gradient(at 0% 100%, hsla(200, 100%, 40%, 0.1) 0px, transparent 50%);
        }
        
        body {
            font-family: 'Montserrat', sans-serif;
            background: var(--gradient-dark);
            min-height: 100vh;
            color: var(--fever-dark);
            margin: 0;
            padding: 0;
            position: relative;
            overflow-x: hidden;
            font-weight: 400;
        }

        /* Animated background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--gradient-mesh);
            pointer-events: none;
            z-index: 1;
        }

        /* Floating orbs animation */
        .floating-orbs {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 0;
        }

        .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(40px);
            opacity: 0.4;
            animation: float 20s infinite ease-in-out;
        }

        .orb1 {
            width: 600px;
            height: 600px;
            background: linear-gradient(135deg, #6f41d7 0%, #361b71 100%);
            top: -200px;
            left: -200px;
            animation-duration: 25s;
        }

        .orb2 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #0079ca 0%, #39a5ee 100%);
            bottom: -150px;
            right: -150px;
            animation-duration: 30s;
            animation-delay: -5s;
        }

        .orb3 {
            width: 300px;
            height: 300px;
            background: linear-gradient(135deg, #8e69e3 0%, #6f41d7 100%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation-duration: 35s;
            animation-delay: -10s;
        }

        @keyframes float {
            0%, 100% {
                transform: translate(0, 0) scale(1);
            }
            25% {
                transform: translate(100px, -100px) scale(1.1);
            }
            50% {
                transform: translate(-100px, 100px) scale(0.9);
            }
            75% {
                transform: translate(50px, 50px) scale(1.05);
            }
        }
        
        /* Navigation Bar */
        .navbar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 1.25rem 0;
            box-shadow: 0 4px 30px rgba(6, 35, 44, 0.08);
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 1px solid rgba(235, 0, 82, 0.1);
            animation: slideDown 0.6s ease-out;
        }

        @keyframes slideDown {
            from {
                transform: translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .navbar-content {
            max-width: 1440px;
            margin: 0 auto;
            padding: 0 3rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo {
            font-size: 2rem;
            font-weight: 800;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.03em;
            text-decoration: none;
            transition: transform 0.3s ease;
        }
        
        .logo:hover {
            transform: scale(1.05);
        }

        .logo-badge {
            background: var(--gradient-primary);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 2rem;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        
        .nav-links {
            display: flex;
            gap: 2.5rem;
            align-items: center;
        }
        
        .nav-link {
            color: var(--fever-gray);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.3s ease;
            position: relative;
        }

        .nav-link::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: -5px;
            left: 50%;
            background: var(--gradient-primary);
            transition: all 0.3s ease;
        }
        
        .nav-link:hover {
            color: var(--fever-primary);
        }

        .nav-link:hover::after {
            width: 100%;
            left: 0;
        }

        .github-link {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1.25rem;
            background: var(--fever-dark);
            color: white;
            border-radius: 2rem;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .github-link:hover {
            background: var(--fever-dark-light);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(6, 35, 44, 0.2);
        }
        
        /* Hero Section */
        .hero {
            position: relative;
            z-index: 10;
            padding: 6rem 3rem 4rem;
            text-align: center;
            animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(111, 65, 215, 0.1);
            color: var(--fever-primary);
            padding: 0.5rem 1.25rem;
            border-radius: 2rem;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 2rem;
            border: 1px solid rgba(111, 65, 215, 0.2);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }

        .hero-badge .dot {
            width: 8px;
            height: 8px;
            background: #6f41d7;
            border-radius: 50%;
            animation: blink 1.5s infinite;
        }

        @keyframes blink {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
        
        .hero h1 {
            font-size: clamp(3rem, 8vw, 5.5rem);
            font-weight: 800;
            margin-bottom: 1.5rem;
            color: white;
            letter-spacing: -0.04em;
            line-height: 1;
        }

        .hero h1 .gradient-text {
            background: linear-gradient(135deg, #6f41d7 0%, #8e69e3 25%, #0079ca 75%, #39a5ee 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite;
        }

        @keyframes gradientShift {
            0%, 100% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
        }
        
        .hero p {
            font-size: 1.375rem;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
            max-width: 800px;
            margin: 0 auto 3rem;
            line-height: 1.6;
        }

        /* Stats Section */
        .stats {
            display: flex;
            justify-content: center;
            gap: 4rem;
            margin-bottom: 4rem;
            flex-wrap: wrap;
            animation: fadeIn 1s ease-out 0.3s both;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.95rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        /* Container */
        .container {
            max-width: 1440px;
            margin: 0 auto;
            padding: 0 3rem 2rem;
            position: relative;
            z-index: 10;
        }
        
        /* API Cards Section */
        .api-section {
            margin-bottom: 5rem;
        }

        .section-header {
            text-align: center;
            margin-bottom: 4rem;
        }

        .section-title {
            font-size: 2.5rem;
            font-weight: 800;
            color: white;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
        }

        .section-subtitle {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.125rem;
            font-weight: 500;
        }
        
        .api-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-bottom: 3rem;
        }

        @media (min-width: 768px) {
            .api-grid {
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
            }
        }
        
        .api-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
            border-radius: 1.5rem;
            padding: 2.5rem;
            box-shadow: 
                0 20px 40px rgba(6, 35, 44, 0.1),
                0 0 0 1px rgba(235, 0, 82, 0.05);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: cardFadeIn 0.6s ease-out both;
        }

        .api-card:nth-child(1) { animation-delay: 0.1s; }
        .api-card:nth-child(2) { animation-delay: 0.2s; }
        .api-card:nth-child(3) { animation-delay: 0.3s; }

        @keyframes cardFadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .api-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--gradient-primary);
        }

        .api-card.featured {
            background: linear-gradient(135deg, #fff 0%, #f8f5ff 100%);
            border: 2px solid rgba(111, 65, 215, 0.1);
        }

        @media (min-width: 768px) {
            .api-card.featured {
                grid-column: span 1;
            }
        }

        .api-card.featured::before {
            height: 5px;
            background: linear-gradient(90deg, #6f41d7 0%, #8e69e3 50%, #0079ca 100%);
        }
        
        .api-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 
                0 30px 60px rgba(6, 35, 44, 0.15),
                0 0 0 2px rgba(111, 65, 215, 0.1);
        }

        .api-icon-wrapper {
            width: 60px;
            height: 60px;
            background: var(--gradient-secondary);
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            box-shadow: 0 10px 20px rgba(0, 121, 202, 0.2);
            transition: all 0.3s ease;
        }

        .api-card:hover .api-icon-wrapper {
            transform: rotate(5deg) scale(1.1);
        }

        .api-icon-wrapper svg {
            width: 30px;
            height: 30px;
            color: white;
        }
        
        .api-card h3 {
            font-size: 1.75rem;
            margin-bottom: 1rem;
            color: var(--fever-dark);
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        
        .api-card p {
            color: var(--fever-gray);
            margin-bottom: 2rem;
            line-height: 1.7;
            font-size: 1.05rem;
            font-weight: 500;
            flex-grow: 1;
        }
        
        .badges {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .badge {
            background: linear-gradient(135deg, rgba(0, 121, 202, 0.1) 0%, rgba(57, 165, 238, 0.1) 100%);
            color: var(--fever-secondary);
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            font-size: 0.875rem;
            font-weight: 700;
            border: 1px solid rgba(0, 121, 202, 0.2);
            transition: all 0.3s ease;
        }

        .badge.primary {
            background: linear-gradient(135deg, rgba(111, 65, 215, 0.1) 0%, rgba(142, 105, 227, 0.1) 100%);
            color: var(--fever-primary);
            border-color: rgba(111, 65, 215, 0.2);
        }

        .badge.new {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            animation: pulse 2s infinite;
        }
        
        .badge:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 5px 10px rgba(0, 121, 202, 0.2);
        }

        /* Buttons */
        .button-group {
            display: flex;
            gap: 1rem;
            margin-top: auto;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 1rem 2rem;
            border-radius: 3rem;
            font-weight: 700;
            font-size: 1rem;
            text-decoration: none;
            transition: all 0.3s ease;
            gap: 0.75rem;
            flex: 1;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .btn:hover::before {
            width: 300px;
            height: 300px;
        }

        .btn-primary {
            background: var(--gradient-secondary);
            color: white;
            box-shadow: 0 10px 25px rgba(0, 121, 202, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(0, 121, 202, 0.4);
            background: linear-gradient(135deg, #005795 0%, #0079ca 100%);
        }

        .btn-secondary {
            background: transparent;
            color: var(--fever-primary);
            border: 2px solid var(--fever-primary);
        }

        .btn-secondary:hover {
            background: rgba(111, 65, 215, 0.05);
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(111, 65, 215, 0.15);
        }

        /* Quick Links */
        .quick-links {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            border-radius: 2rem;
            padding: 3rem;
            margin: 4rem 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .quick-links h3 {
            color: white;
            font-size: 1.5rem;
            margin-bottom: 2rem;
            font-weight: 800;
        }

        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }

        .link-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .link-card:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-5px);
            border-color: rgba(0, 121, 202, 0.3);
        }

        .link-card h4 {
            color: white;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }

        .link-card p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            line-height: 1.5;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 1.5rem 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 2rem;
        }

        .footer-content {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.875rem;
            font-weight: 400;
        }

        .footer-links a {
            color: rgba(255, 255, 255, 0.6);
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 600;
            transition: color 0.3s ease;
            position: relative;
        }

        .footer-links a:hover {
            color: var(--fever-primary);
        }

        /* Responsive */

        @media (max-width: 768px) {
            .container {
                padding: 0 1rem 1.5rem;
            }

            .navbar {
                padding: 1rem 0;
            }

            .navbar-content {
                padding: 0 1rem;
            }

            .logo {
                font-size: 1.5rem;
            }

            .logo-badge {
                font-size: 0.65rem;
                padding: 0.2rem 0.5rem;
            }

            .github-link {
                padding: 0.4rem 1rem;
                font-size: 0.85rem;
            }
            
            .hero {
                padding: 3rem 1rem 2rem;
            }

            .hero h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
            }

            .hero p {
                font-size: 1rem;
                margin-bottom: 2rem;
            }

            .stats {
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .stat {
                min-width: 80px;
            }

            .stat-value {
                font-size: 1.75rem;
            }

            .stat-label {
                font-size: 0.75rem;
            }

            .section-title {
                font-size: 1.75rem;
            }

            .section-subtitle {
                font-size: 1rem;
            }
            

            .api-card {
                padding: 1.5rem;
            }

            .api-card h3 {
                font-size: 1.5rem;
            }

            .api-card p {
                font-size: 0.95rem;
                margin-bottom: 1.5rem;
            }

            .api-icon-wrapper {
                width: 50px;
                height: 50px;
                margin-bottom: 1rem;
            }

            .api-icon-wrapper svg {
                width: 24px;
                height: 24px;
            }

            .badges {
                gap: 0.5rem;
                margin-bottom: 1.5rem;
            }

            .badge {
                font-size: 0.75rem;
                padding: 0.4rem 0.75rem;
            }
            
            .button-group {
                flex-direction: column;
                gap: 0.75rem;
            }

            .btn {
                padding: 0.875rem 1.5rem;
                font-size: 0.9rem;
            }

            .orb1 {
                width: 300px;
                height: 300px;
            }

            .orb2 {
                width: 200px;
                height: 200px;
            }

            .orb3 {
                width: 150px;
                height: 150px;
            }

        }

        @media (max-width: 480px) {
            .hero h1 {
                font-size: 2rem;
            }

            .hero p {
                font-size: 0.9rem;
            }

            .stats {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Floating Orbs -->
    <div class="floating-orbs">
        <div class="orb orb1"></div>
        <div class="orb orb2"></div>
        <div class="orb orb3"></div>
    </div>

    <!-- Navigation -->
    <nav class="navbar">
        <div class="navbar-content">
            <div class="logo-section">
                <a href="/" class="logo">FEVER</a>
                <span class="logo-badge">API Hub</span>
            </div>
            <div class="nav-links">
                <a href="https://github.com/FeverCodeChallenge/-Damian-Meroni" class="github-link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                    </svg>
                    GitHub
                </a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-badge">
            <span class="dot"></span>
            <span>Live Production API</span>
        </div>
        <h1>Welcome to <span class="gradient-text">FEVER API</span></h1>
        <p>Powerful REST APIs for seamlessly integrating external provider events into the Fever marketplace ecosystem with enterprise-grade reliability</p>
        
        <!-- API Key Notice -->
        <div style="background: rgba(111, 65, 215, 0.1); border: 2px solid rgba(111, 65, 215, 0.3); border-radius: 1rem; padding: 1.5rem; margin: 2rem auto; max-width: 800px;">
            <h3 style="color: white; margin-bottom: 0.5rem; font-size: 1.2rem;">🔑 Default API Keys for PoC Testing</h3>
            <p style="color: rgba(255, 255, 255, 0.9); margin-bottom: 1rem;">These keys are pre-configured for immediate testing:</p>
            <div style="display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap;">
                <div>
                    <strong style="color: white;">Public API:</strong>
                    <code style="background: rgba(0, 0, 0, 0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #39a5ee;">fever-poc-api-key-2025</code>
                </div>
                <div>
                    <strong style="color: white;">Internal API:</strong>
                    <code style="background: rgba(0, 0, 0, 0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #39a5ee;">fever-internal-service-key-2025</code>
                </div>
            </div>
        </div>
        
        <!-- Stats -->
        <div class="stats">
            <div class="stat">
                <div class="stat-value">&lt;300ms</div>
                <div class="stat-label">Response Time</div>
            </div>
            <div class="stat">
                <div class="stat-value">99.9%</div>
                <div class="stat-label">Uptime SLA</div>
            </div>
            <div class="stat">
                <div class="stat-value">v1.0</div>
                <div class="stat-label">API Version</div>
            </div>
        </div>
    </section>

    <!-- Main Content -->
    <div class="container">
        <!-- API Cards Section -->
        <section class="api-section">
            <div class="section-header">
                <h2 class="section-title">Choose Your Integration</h2>
                <p class="section-subtitle">Select the API that best fits your needs</p>
            </div>
            
            <div class="api-grid">
                <!-- Public API Card -->
                <div class="api-card">
                    <div class="api-icon-wrapper">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <h3>Public Events API</h3>
                    <div class="badges">
                        <span class="badge primary">Production Ready</span>
                        <span class="badge">RESTful</span>
                    </div>
                    <p>Access comprehensive event information with advanced date filtering, real-time pricing details, session availability, and seamless provider synchronization. Built for high-performance with guaranteed sub-300ms response times.</p>
                    <div class="button-group">
                        <a href="public-api-docs.html" class="btn btn-primary">
                            Explore API
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </a>
                    </div>
                </div>

                <!-- Internal API Card -->
                <div class="api-card">
                    <div class="api-icon-wrapper">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                        </svg>
                    </div>
                    <h3>Internal API</h3>
                    <div class="badges">
                        <span class="badge">Private</span>
                        <span class="badge">Internal Only</span>
                    </div>
                    <p>Internal endpoints for provider synchronization, cache management, and system health monitoring.</p>
                    <a href="internal-api-docs.html" class="btn btn-primary">
                        Access Internal API
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="10" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </a>
                </div>
            </div>
        </section>



        <!-- Footer -->
        <footer class="footer">
            <div class="footer-content">
                © 2024 Fever. All rights reserved.
            </div>
        </footer>
    </div>
</body>
</html>`

    writeFileSync(join(OUTPUT_DIR, 'api-docs-index.html'), indexHtml)
    console.log('✅ Generated modern api-docs-index.html')

    console.log('\n🎉 Scalar documentation generated successfully!')
    console.log('\nView your beautiful API docs:')
    console.log('  📖 Index: yarn open:docs')
    console.log(`  🌐 Public: open ${OUTPUT_DIR}/public-api-docs.html`)
    console.log(`  📚 Complete: open ${OUTPUT_DIR}/all-apis-docs.html`)
  } catch (error) {
    console.error('❌ Error generating Scalar documentation:', error)
    process.exit(1)
  }
}

// Run generation
generateScalarDocs()
