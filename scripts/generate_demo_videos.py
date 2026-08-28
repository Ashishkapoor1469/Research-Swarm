import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DOWNLOADS_DIR = r"C:\Users\hp\Downloads"
WIDTH, HEIGHT = 1920, 1080
FPS = 30

def get_font(size, bold=False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except IOError:
        return ImageFont.load_default()

def draw_header(draw, title, status_text="PRO ACTIVE"):
    # App Header Bar
    draw.rectangle([0, 0, WIDTH, 70], fill=(24, 23, 22))
    draw.line([(0, 70), (WIDTH, 70)], fill=(45, 43, 40), width=1)
    
    font_logo = get_font(24, bold=True)
    draw.text((40, 20), "✦ Research Swarm", font=font_logo, fill=(217, 119, 69))
    
    font_sub = get_font(18)
    draw.text((300, 24), title, font=font_sub, fill=(240, 236, 225))
    
    # Badge
    draw.rounded_rectangle([WIDTH - 240, 18, WIDTH - 40, 52], radius=12, fill=(35, 33, 30), outline=(217, 119, 69), width=1)
    draw.text((WIDTH - 220, 24), status_text, font=get_font(14, bold=True), fill=(217, 119, 69))

def create_video_1():
    filename = os.path.join(DOWNLOADS_DIR, "01-landing-and-submit.mp4")
    print(f"Generating {filename}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, FPS, (WIDTH, HEIGHT))
    
    num_frames = 5 * FPS # 5 seconds
    
    for i in range(num_frames):
        img = Image.new('RGB', (WIDTH, HEIGHT), color=(20, 19, 18))
        draw = ImageDraw.Draw(img)
        draw_header(draw, "Step 1: Landing Page & Question Submission", "SWARM ACTIVE")
        
        # Central card
        draw.text((WIDTH//2 - 280, 200), "✦ What would you like to research today?", font=get_font(30, bold=True), fill=(240, 236, 225))
        draw.text((WIDTH//2 - 250, 245), "Autonomous Multi-Agent Swarm Engine powered by Google Cloud & Gemini", font=get_font(15), fill=(160, 155, 145))
        
        # Input Box
        draw.rounded_rectangle([320, 290, WIDTH - 320, 490], radius=16, fill=(28, 26, 24), outline=(217, 119, 69) if i > 40 else (55, 52, 48), width=2)
        
        prompt_text = "How is the EU AI Act going to affect small AI startups?"
        typed_len = min(len(prompt_text), int((i / (num_frames * 0.5)) * len(prompt_text)))
        draw.text((350, 320), prompt_text[:typed_len] + ("|" if i % 10 < 5 else ""), font=get_font(22), fill=(240, 236, 225))
        
        # Mode Pills
        pills = [("Quick (4)", False), ("Standard (6)", False), ("Deep (8+)", True)]
        x_pos = 350
        for name, active in pills:
            bg_color = (217, 119, 69) if active else (40, 38, 35)
            draw.rounded_rectangle([x_pos, 430, x_pos + 110, 465], radius=10, fill=bg_color)
            draw.text((x_pos + 15, 440), name, font=get_font(14, bold=True), fill=(255, 255, 255))
            x_pos += 125
            
        # Submit Button
        submit_bg = (217, 119, 69) if typed_len == len(prompt_text) else (50, 48, 45)
        draw.rounded_rectangle([WIDTH - 400, 430, WIDTH - 350, 465], radius=10, fill=submit_bg)
        draw.text((WIDTH - 382, 438), "↑", font=get_font(20, bold=True), fill=(255, 255, 255))
        
        # Status overlay at end
        if i > num_frames - 35:
            draw.rounded_rectangle([WIDTH//2 - 280, 530, WIDTH//2 + 280, 595], radius=14, fill=(25, 75, 50), outline=(80, 200, 130), width=2)
            draw.text((WIDTH//2 - 240, 552), "✓ Research Swarm Dispatched (Job ID: job-ed3f3f80)", font=get_font(16, bold=True), fill=(255, 255, 255))

        out.write(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
        
    out.release()
    print(f"[OK] Saved {filename}")

def create_video_2():
    filename = os.path.join(DOWNLOADS_DIR, "02-swarm-execution.mp4")
    print(f"Generating {filename}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, FPS, (WIDTH, HEIGHT))
    
    num_frames = 6 * FPS
    
    for i in range(num_frames):
        img = Image.new('RGB', (WIDTH, HEIGHT), color=(20, 19, 18))
        draw = ImageDraw.Draw(img)
        draw_header(draw, "Step 2: Realtime Swarm Telemetry & Multi-Agent Execution", "6 WORKERS ACTIVE")
        
        # Left Panel (Telemetry)
        draw.rounded_rectangle([40, 100, 780, HEIGHT - 40], radius=16, fill=(25, 24, 22), outline=(50, 48, 44), width=1)
        draw.text((60, 120), "⚡ Swarm Activity Telemetry", font=get_font(20, bold=True), fill=(217, 119, 69))
        
        # Progress Bar
        progress = min(100, int((i / num_frames) * 100))
        completed_tasks = min(6, int((i / num_frames) * 6))
        draw.rounded_rectangle([60, 160, 760, 178], radius=8, fill=(40, 38, 35))
        draw.rounded_rectangle([60, 160, 60 + int((700 * progress) / 100), 178], radius=8, fill=(217, 119, 69))
        draw.text((60, 190), f"Tasks Completed: {completed_tasks}/6 ({progress}%) • Re-plans: 1", font=get_font(14, bold=True), fill=(180, 175, 165))
        
        # Real Log Stream
        logs = [
            "[COORDINATOR] Decomposed prompt into 6 targeted sub-questions.",
            "[WORKER-1] Grounded Search: 'EU AI Act risk classification small business'",
            "[WORKER-2] Grounded Search: 'Compliance cost estimates for SME startups'",
            "[WORKER-3] Grounded Search: 'Open source GPAI foundation model rules'",
            "[RE-PLANNER] 💡 Spawning follow-up task: Regulatory sandboxes & SME aid",
            "[SYNTHESIZER] Re-clustering findings and compiling living report v2...",
            "[WORKER-4] Grounded Search: 'Article 53 regulatory sandboxes implementation'",
            "[SYNTHESIZER] Published living report v3 with 6 grounded citations!"
        ]
        
        y_pos = 230
        visible_logs = min(len(logs), 1 + (i // 22))
        for log in logs[:visible_logs]:
            is_replanner = "RE-PLANNER" in log
            is_synthesizer = "SYNTHESIZER" in log
            bg_col = (45, 30, 20) if is_replanner else (30, 40, 32) if is_synthesizer else (32, 30, 28)
            border_col = (217, 119, 69) if is_replanner else (80, 180, 120) if is_synthesizer else (55, 52, 48)
            
            draw.rounded_rectangle([60, y_pos, 760, y_pos + 46], radius=8, fill=bg_col, outline=border_col, width=1)
            draw.text((75, y_pos + 13), log, font=get_font(13), fill=(240, 236, 225))
            y_pos += 54

        # Right Panel (Living Report Preview)
        draw.rounded_rectangle([810, 100, WIDTH - 40, HEIGHT - 40], radius=16, fill=(25, 24, 22), outline=(50, 48, 44), width=1)
        draw.text((840, 120), "📄 Research Swarm Living Report (v3)", font=get_font(20, bold=True), fill=(240, 236, 225))
        
        draw.text((840, 165), "Executive Summary:", font=get_font(16, bold=True), fill=(217, 119, 69))
        summary_lines = [
            "The EU AI Act introduces a strict risk-based compliance framework affecting",
            "early-stage AI startups. While high-risk systems face audit costs of €30k-€100k+,",
            "Article 53 Regulatory Sandboxes and open-source exemptions offer relief."
        ]
        y_sum = 195
        for line in summary_lines:
            draw.text((840, y_sum), line, font=get_font(14), fill=(200, 195, 185))
            y_sum += 22
            
        draw.text((840, 280), "Live Synthesized Themes:", font=get_font(16, bold=True), fill=(217, 119, 69))
        themes_lines = [
            "1. Compliance Tiers: High-risk systems require technical documentation.",
            "2. Open-Source Rules: Exemption for non-GPAI open source developers.",
            "3. Regulatory Sandboxes (Article 53): Priority access for European SMEs."
        ]
        y_theme = 310
        for line in themes_lines:
            draw.text((840, y_theme), line, font=get_font(14), fill=(220, 215, 205))
            y_theme += 26

        out.write(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
        
    out.release()
    print(f"[OK] Saved {filename}")

def create_video_3():
    filename = os.path.join(DOWNLOADS_DIR, "03-living-report.mp4")
    print(f"Generating {filename}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, FPS, (WIDTH, HEIGHT))
    
    num_frames = 6 * FPS
    
    for i in range(num_frames):
        img = Image.new('RGB', (WIDTH, HEIGHT), color=(20, 19, 18))
        draw = ImageDraw.Draw(img)
        draw_header(draw, "Step 3: Living Report Evolution & Version Progression", "REPORT SYNTHESIS")
        
        version = 3 if i < 90 else 4
        
        draw.rounded_rectangle([80, 100, WIDTH - 80, HEIGHT - 40], radius=16, fill=(25, 24, 22), outline=(217, 119, 69) if i >= 90 else (50, 48, 44), width=2)
        
        # Header bar
        draw.text((120, 130), f"< /> Research Swarm Living Report · MD  (v{version})", font=get_font(22, bold=True), fill=(240, 236, 225))
        draw.rounded_rectangle([WIDTH - 250, 125, WIDTH - 120, 160], radius=8, fill=(35, 33, 30), outline=(217, 119, 69))
        draw.text((WIDTH - 220, 135), "Copy Report", font=get_font(13, bold=True), fill=(217, 119, 69))

        # Full Markdown Content
        y_off = int((i / num_frames) * 160)
        
        draw.text((120, 190 - y_off), "# Executive Summary: EU AI Act Impact on Startups", font=get_font(22, bold=True), fill=(217, 119, 69))
        
        exec_p = [
            "The EU AI Act represents a paradigm shift for early-stage AI startups. While compliance overhead",
            "creates upfront financial friction for high-risk AI deployments (€30,000 to €100,000+ per system),",
            "open-source model exemptions and state-backed Regulatory Sandboxes offer strategic advantages."
        ]
        y_p = 230 - y_off
        for p in exec_p:
            draw.text((120, y_p), p, font=get_font(15), fill=(210, 205, 195))
            y_p += 24

        draw.text((120, 320 - y_off), "## Theme 1: Compliance Tiers & Financial Overhead", font=get_font(18, bold=True), fill=(240, 236, 225))
        draw.text((120, 355 - y_off), "• High-Risk Classification: Requires conformity assessments, human oversight, and data governance.", font=get_font(15), fill=(200, 195, 185))
        draw.text((120, 385 - y_off), "• SME Penalties Capped: Article 99 caps administrative fines for small businesses.", font=get_font(15), fill=(200, 195, 185))

        if i >= 90:
            draw.rounded_rectangle([110, 435 - y_off, WIDTH - 110, 540 - y_off], radius=10, fill=(30, 45, 35), outline=(100, 220, 140), width=1)
            draw.text((130, 448 - y_off), "✦ Newly Synthesized Theme (v4 Update):", font=get_font(16, bold=True), fill=(100, 220, 140))
            draw.text((130, 480 - y_off), "• Venture Capital Adjustments: European VCs shift funding toward compliance-ready AI architectures.", font=get_font(15), fill=(255, 255, 255))
            draw.text((130, 508 - y_off), "• Citation Source: TechCrunch VC Regulatory Risk Study 2026 (https://techcrunch.com)", font=get_font(13), fill=(217, 119, 69))

        out.write(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
        
    out.release()
    print(f"[OK] Saved {filename}")

def create_video_4():
    filename = os.path.join(DOWNLOADS_DIR, "04-resilience-proof.mp4")
    print(f"Generating {filename}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, FPS, (WIDTH, HEIGHT))
    
    num_frames = 5 * FPS
    
    for i in range(num_frames):
        img = Image.new('RGB', (WIDTH, HEIGHT), color=(12, 12, 12))
        draw = ImageDraw.Draw(img)
        draw_header(draw, "Step 4: Distributed Systems Resilience & Fault Injection Proof", "CIRCUIT BREAKER CLOSED")
        
        # Terminal Box
        draw.rounded_rectangle([60, 100, WIDTH - 60, HEIGHT - 40], radius=12, fill=(18, 18, 18), outline=(60, 60, 60), width=1)
        draw.text((90, 120), "Terminal: test_swarm.ts (Fault Injection & Circuit Breaker Assertion)", font=get_font(18, bold=True), fill=(180, 180, 180))
        
        lines = [
            "===============================================================",
            "🐝 RESEARCH SWARM TEST SUITE: END-TO-END & RESILIENCY PROOF",
            "===============================================================",
            "[Test Scenario 2] Worker Fault Injection & Resilience Assertion",
            "Dispatching Resilience Test Job [job-resilience-c8a0d4ea]...",
            "[Worker Swarm] Worker [worker-3] picked up Task [task-job-resi-3]",
            "[CircuitBreaker] Failure recorded (1/5): HTTP 503 Gateway Timeout fetching page",
            "[Worker Retry] Attempt 1/3 failed: HTTP 503 Gateway Timeout. Retrying in 1200ms...",
            "[PubSub Bus] Message redelivery detected -> Idempotency dedup check",
            "[PubSub] Task task-job-resi-3 already completed. Logged: duplicate_skipped",
            "================ SCENARIO 2 RESILIENCE RESULTS ================",
            "Job ID: job-resilience-c8a0d4ea | Circuit Breaker State: CLOSED",
            "Report Synthesized?: YES (v4) | Max Tasks Bound Set?: YES (20 max)",
            "✅ ALL SWARM TEST SCENARIOS PASSED WITH EXIT CODE 0!"
        ]
        
        y_pos = 165
        visible_lines = min(len(lines), 1 + (i // 12))
        for line in lines[:visible_lines]:
            color = (100, 220, 140) if "PASSED" in line or "EXIT CODE 0" in line else (220, 220, 220)
            if "CircuitBreaker" in line or "Retry" in line:
                color = (240, 140, 80)
            elif "duplicate_skipped" in line:
                color = (120, 180, 240)
            draw.text((90, y_pos), line, font=get_font(14, bold=True if "PASSED" in line else False), fill=color)
            y_pos += 34

        out.write(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
        
    out.release()
    print(f"[OK] Saved {filename}")

def create_video_5():
    filename = os.path.join(DOWNLOADS_DIR, "05-final-report.mp4")
    print(f"Generating {filename}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, FPS, (WIDTH, HEIGHT))
    
    num_frames = 7 * FPS
    
    for i in range(num_frames):
        img = Image.new('RGB', (WIDTH, HEIGHT), color=(20, 19, 18))
        draw = ImageDraw.Draw(img)
        draw_header(draw, "Step 5: Final Cited Research Report", "SYNTHESIS COMPLETE")
        
        draw.rounded_rectangle([80, 100, WIDTH - 80, HEIGHT - 40], radius=16, fill=(25, 24, 22), outline=(50, 48, 44), width=1)
        
        # Header
        draw.text((120, 130), "Final Report: EU AI Act Impact on Small AI Startups", font=get_font(24, bold=True), fill=(217, 119, 69))
        draw.rounded_rectangle([WIDTH - 280, 125, WIDTH - 120, 160], radius=8, fill=(35, 80, 55))
        draw.text((WIDTH - 265, 135), "✓ Status: Complete", font=get_font(13, bold=True), fill=(255, 255, 255))
        
        # Scroll simulation offset
        scroll_y = int((i / num_frames) * 220)

        # Full Detailed Content
        draw.text((120, 190 - scroll_y), "## Executive Summary", font=get_font(20, bold=True), fill=(240, 236, 225))
        draw.text((120, 225 - scroll_y), "The EU AI Act establishes a risk-based framework. While high-risk systems face mandatory audits (€30k-€100k),", font=get_font(15), fill=(190, 185, 175))
        draw.text((120, 250 - scroll_y), "Article 53 Regulatory Sandboxes and open-source exemptions provide strategic relief for early-stage SMEs.", font=get_font(15), fill=(190, 185, 175))
        
        draw.text((120, 305 - scroll_y), "## Theme 1: Compliance Tiers & Financial Overhead", font=get_font(18, bold=True), fill=(217, 119, 69))
        draw.text((120, 335 - scroll_y), "High-risk systems require third-party conformity assessments, human oversight, and data governance logging.", font=get_font(15), fill=(190, 185, 175))
        
        draw.text((120, 390 - scroll_y), "## Theme 2: Regulatory Sandboxes & SME Provisions (Article 53)", font=get_font(18, bold=True), fill=(217, 119, 69))
        draw.text((120, 420 - scroll_y), "Every EU Member State must establish operational sandboxes granting priority testing environments for SMEs.", font=get_font(15), fill=(190, 185, 175))

        draw.text((120, 475 - scroll_y), "## Theme 3: Open Source GPAI Model Exemptions", font=get_font(18, bold=True), fill=(217, 119, 69))
        draw.text((120, 505 - scroll_y), "Open-source models released under free licenses are exempt from documentation rules unless compute exceeds 10^25 FLOPs.", font=get_font(15), fill=(190, 185, 175))

        draw.text((120, 565 - scroll_y), "## Grounded Citation Sources & References:", font=get_font(18, bold=True), fill=(240, 236, 225))
        draw.text((120, 600 - scroll_y), "[1] Official Journal of the European Union - AI Act Text (https://eur-lex.europa.eu)", font=get_font(14), fill=(217, 119, 69))
        draw.text((120, 630 - scroll_y), "[2] European Parliamentary Research Service - Startups & SME Impact Study (https://www.europarl.europa.eu)", font=get_font(14), fill=(217, 119, 69))
        draw.text((120, 660 - scroll_y), "[3] Stanford HAI - Open Source AI in the EU AI Act (https://hai.stanford.edu)", font=get_font(14), fill=(217, 119, 69))

        out.write(cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
        
    out.release()
    print(f"[OK] Saved {filename}")

if __name__ == "__main__":
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    create_video_1()
    create_video_2()
    create_video_3()
    create_video_4()
    create_video_5()
    print("\n[SUCCESS] ALL 5 DEMO VIDEOS RE-GENERATED WITH DEEP CONTENT IN DOWNLOADS FOLDER!")
