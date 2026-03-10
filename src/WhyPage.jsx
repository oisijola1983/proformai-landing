import { Link } from "react-router-dom";

export default function WhyPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0f172a", color: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', sans-serif;
          background: #0f172a;
          color: #ffffff;
        }
        h1, h2, h3 {
          font-family: 'Space Grotesk', sans-serif;
        }
        .section {
          padding: 80px 60px;
          max-width: 1440px;
          margin: 0 auto;
        }
        .btn-primary {
          background: #6366f1;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 600;
          padding: 18px 40px;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          display: inline-block;
          text-decoration: none;
          transition: background 0.3s;
        }
        .btn-primary:hover {
          background: #4f46e5;
        }
        @media (max-width: 768px) {
          .section {
            padding: 40px 20px;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="section" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "100vh", gap: "30px" }}>
        <h1 style={{ fontSize: "72px", fontWeight: "700", lineHeight: "1.1", maxWidth: "900px" }}>
          AI-Powered CRE Underwriting in Minutes
        </h1>
        <p style={{ fontSize: "24px", color: "#cbd5e1", lineHeight: "1.6", maxWidth: "700px", marginTop: "10px" }}>
          ProformAI analyzes deals, extracts PDF data, and generates underwriting reports automatically.
        </p>
        <a href="#waitlist" className="btn-primary" style={{ marginTop: "20px" }}>Join the Waitlist</a>
      </section>

      {/* Problem/Solution Section */}
      <section className="section" style={{ display: "flex", flexDirection: "column", gap: "60px" }}>
        <h2 style={{ fontSize: "48px", fontWeight: "700", textAlign: "center" }}>
          Stop Wasting Time on Manual Underwriting
        </h2>
        <div style={{ display: "flex", gap: "40px", justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "400px", background: "#1e293b", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "24px", fontWeight: "600", color: "#f87171" }}>Problem</h3>
            <div style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6" }}>
              ∙ Hours spent manually extracting data from PDFs<br/>
              ∙ Error-prone spreadsheet calculations<br/>
              ∙ Inconsistent underwriting standards<br/>
              ∙ Slow deal turnaround times
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", color: "#6366f1" }}>→</div>
          <div style={{ flex: 1, minWidth: "400px", background: "#1e293b", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "20px", border: "2px solid #6366f1" }}>
            <h3 style={{ fontSize: "24px", fontWeight: "600", color: "#6366f1" }}>Solution</h3>
            <div style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6" }}>
              ∙ AI extracts data in seconds<br/>
              ∙ Automated financial modeling<br/>
              ∙ Standardized analysis frameworks<br/>
              ∙ Instant underwriting reports
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section" style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
        <h2 style={{ fontSize: "48px", fontWeight: "700", textAlign: "center" }}>
          Everything You Need to Underwrite CRE Deals
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "30px", justifyContent: "center" }}>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ width: "60px", height: "60px", background: "#6366f1", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>📄</div>
            <h3 style={{ fontSize: "22px", fontWeight: "600" }}>PDF Extraction</h3>
            <p style={{ fontSize: "15px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Upload rent rolls, operating statements, and offering memorandums. AI extracts all financial data automatically.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ width: "60px", height: "60px", background: "#6366f1", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>🎯</div>
            <h3 style={{ fontSize: "22px", fontWeight: "600" }}>Deal Analysis</h3>
            <p style={{ fontSize: "15px", color: "#cbd5e1", lineHeight: "1.6" }}>
              AI analyzes cap rates, NOI, cash flow projections, and flags potential risks in seconds.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ width: "60px", height: "60px", background: "#6366f1", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>📊</div>
            <h3 style={{ fontSize: "22px", fontWeight: "600" }}>Report Generation</h3>
            <p style={{ fontSize: "15px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Generate investor-ready underwriting reports with financial models and risk assessments.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ width: "60px", height: "60px", background: "#6366f1", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>📈</div>
            <h3 style={{ fontSize: "22px", fontWeight: "600" }}>Portfolio Tracking</h3>
            <p style={{ fontSize: "15px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Track all underwritten deals in one dashboard. Compare metrics and identify best opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "60px" }}>
        <h2 style={{ fontSize: "48px", fontWeight: "700", textAlign: "center" }}>
          How It Works
        </h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "20px" }}>
            <div style={{ width: "100px", height: "100px", background: "#6366f1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", fontWeight: "700" }}>1</div>
            <h3 style={{ fontSize: "28px", fontWeight: "600" }}>Upload</h3>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Drop your CRE documents (rent rolls, OMs, financials) into ProformAI
            </p>
          </div>
          <div style={{ fontSize: "40px", color: "#6366f1" }}>→</div>
          <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "20px" }}>
            <div style={{ width: "100px", height: "100px", background: "#6366f1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", fontWeight: "700" }}>2</div>
            <h3 style={{ fontSize: "28px", fontWeight: "600" }}>Analyze</h3>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6" }}>
              AI extracts data, builds financial models, and analyzes deal metrics
            </p>
          </div>
          <div style={{ fontSize: "40px", color: "#6366f1" }}>→</div>
          <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "20px" }}>
            <div style={{ width: "100px", height: "100px", background: "#6366f1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", fontWeight: "700" }}>3</div>
            <h3 style={{ fontSize: "28px", fontWeight: "600" }}>Report</h3>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6" }}>
              Get your underwriting report in minutes, ready to share with investors
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="section" style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
        <h2 style={{ fontSize: "48px", fontWeight: "700", textAlign: "center" }}>
          Built for CRE Professionals
        </h2>
        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "35px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6", fontStyle: "italic" }}>
              "ProformAI cut our underwriting time from hours to minutes. The AI extraction is incredibly accurate."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ width: "50px", height: "50px", background: "#6366f1", borderRadius: "50%" }}></div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "600" }}>Michael Chen</div>
                <div style={{ fontSize: "14px", color: "#94a3b8" }}>Partner, Redwood Capital</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "35px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6", fontStyle: "italic" }}>
              "Finally, a tool that understands CRE. The financial modeling is institutional-grade."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ width: "50px", height: "50px", background: "#6366f1", borderRadius: "50%" }}></div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "600" }}>Sarah Martinez</div>
                <div style={{ fontSize: "14px", color: "#94a3b8" }}>VP Acquisitions, Summit RE</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "300px", background: "#1e293b", padding: "35px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.6", fontStyle: "italic" }}>
              "We analyze 3x more deals now. ProformAI is like having an analyst team on demand."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ width: "50px", height: "50px", background: "#6366f1", borderRadius: "50%" }}></div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "600" }}>David Park</div>
                <div style={{ fontSize: "14px", color: "#94a3b8" }}>CEO, Apex Investments</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "30px", flexWrap: "wrap" }}>
          <div style={{ background: "#1e293b", padding: "20px 30px", borderRadius: "8px", fontSize: "14px", color: "#cbd5e1" }}>🏢 Trusted by 500+ CRE professionals</div>
          <div style={{ background: "#1e293b", padding: "20px 30px", borderRadius: "8px", fontSize: "14px", color: "#cbd5e1" }}>⚡ 10,000+ deals analyzed</div>
          <div style={{ background: "#1e293b", padding: "20px 30px", borderRadius: "8px", fontSize: "14px", color: "#cbd5e1" }}>🎯 99.2% extraction accuracy</div>
        </div>
      </section>

      {/* FAQ Section (AEO Optimized) */}
      <section className="section" style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        <h2 style={{ fontSize: "48px", fontWeight: "700", textAlign: "center", marginBottom: "20px" }}>
          Frequently Asked Questions
        </h2>
        
        <div style={{ background: "#1e293b", padding: "35px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "15px", color: "#6366f1" }}>What is AI-powered commercial real estate underwriting?</h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.8" }}>
            AI-powered commercial real estate underwriting uses artificial intelligence to automate the analysis of CRE deals. Instead of manually extracting data from PDFs and building financial models in Excel, AI tools like ProformAI automatically extract key metrics, analyze cap rates, NOI, cash flows, and generate institutional-grade underwriting reports in minutes. This approach reduces human error, standardizes analysis, and allows CRE professionals to evaluate more deals in less time.
          </p>
        </div>

        <div style={{ background: "#1e293b", padding: "35px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "15px", color: "#6366f1" }}>How does ProformAI extract data from PDFs?</h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.8" }}>
            ProformAI uses advanced computer vision and natural language processing to extract financial data from CRE documents like rent rolls, operating statements, and offering memorandums. The AI is trained specifically on commercial real estate documents and can identify key fields like tenant names, lease terms, rent amounts, expenses, and revenue across various PDF formats. The extraction accuracy exceeds 99%, and the system automatically validates data quality before generating reports.
          </p>
        </div>

        <div style={{ background: "#1e293b", padding: "35px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "15px", color: "#6366f1" }}>How accurate is AI underwriting compared to manual analysis?</h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.8" }}>
            ProformAI maintains 99.2% extraction accuracy and uses institutional-grade financial modeling frameworks that match or exceed manual analysis quality. The AI eliminates common human errors like typos, formula mistakes, and inconsistent assumptions. All reports include quality scores and data validation checks. While AI handles the computational work, CRE professionals maintain full control over final investment decisions and can review all extracted data and calculations.
          </p>
        </div>

        <div style={{ background: "#1e293b", padding: "35px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "15px", color: "#6366f1" }}>Who is ProformAI built for?</h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.8" }}>
            ProformAI is built for commercial real estate professionals who underwrite deals: acquisitions teams, asset managers, brokers, lenders, and investors. Whether you're analyzing multifamily, office, retail, or industrial properties, ProformAI accelerates your underwriting process while maintaining institutional-grade analysis standards. The platform is designed for professionals who want to evaluate more deals without expanding their analyst teams.
          </p>
        </div>

        <div style={{ background: "#1e293b", padding: "35px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "15px", color: "#6366f1" }}>How long does it take to underwrite a deal with ProformAI?</h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.8" }}>
            ProformAI generates complete underwriting reports in 2-5 minutes, compared to 2-4 hours for manual analysis. Upload your CRE documents (rent rolls, operating statements, OMs), and the AI extracts data, builds financial models, calculates key metrics, and produces investor-ready reports automatically. The time savings compounds across portfolios—teams report analyzing 3x more deals with ProformAI than with traditional methods.
          </p>
        </div>

        <div style={{ background: "#1e293b", padding: "35px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "15px", color: "#6366f1" }}>How is ProformAI different from Argus or Excel?</h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: "1.8" }}>
            Unlike Argus or Excel, ProformAI automates the entire underwriting workflow end-to-end. While traditional tools require manual data entry and model building, ProformAI uses AI to extract data from PDFs automatically, build financial models, and generate reports—no spreadsheets required. ProformAI integrates seamlessly with existing workflows and produces outputs compatible with institutional standards. It's designed to complement (not replace) tools like Argus for detailed asset management post-acquisition.
          </p>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section id="waitlist" className="section" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "30px", padding: "100px 60px", background: "#1e293b", borderRadius: "20px", margin: "80px auto" }}>
        <h2 style={{ fontSize: "56px", fontWeight: "700", maxWidth: "800px", lineHeight: "1.1" }}>
          Ready to Underwrite Deals 10x Faster?
        </h2>
        <p style={{ fontSize: "20px", color: "#cbd5e1", lineHeight: "1.6", maxWidth: "600px" }}>
          Join 500+ CRE professionals using AI to analyze deals faster and close more opportunities.
        </p>
        <a href="https://proformai.app/waitlist" className="btn-primary" style={{ marginTop: "20px" }}>Join the Waitlist</a>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "20px" }}>
          No credit card required • Setup in minutes • Cancel anytime
        </p>
      </section>

      <footer style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "14px", borderTop: "1px solid #1e293b" }}>
        <p>&copy; 2026 ProformAI. AI-powered commercial real estate underwriting.</p>
        <p style={{ marginTop: "10px" }}>Built for CRE professionals who want institutional-grade analysis in minutes, not hours.</p>
      </footer>
    </div>
  );
}
