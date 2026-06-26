export default function Trademarks() {
  return (
    <main style={{ fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: 'auto', padding: '40px 20px', lineHeight: 1.7, color: '#222' }}>
      <h1 style={{ color: '#111' }}>Trademark Notice</h1>
      <p style={{ color: '#666', fontSize: 14 }}>Effective Date: June 25, 2026</p>

      <p>
        The following trademarks and service marks are owned by Mac &amp; Sac Enterprises LLC
        or David W. MacCutcheon individually, and are pending registration or registered with
        the United States Patent and Trademark Office (USPTO). All rights reserved.
      </p>

      <h2 style={{ color: '#111' }}>Marks Owned by Mac &amp; Sac Enterprises LLC</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={th}>Mark</th>
            <th style={th}>Serial #</th>
            <th style={th}>Status</th>
            <th style={th}>Classes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>America 250 Proof™ (Design + Shield Logo)</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99731808&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99731808</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 025 — Apparel</td>
          </tr>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <td style={td}>America 250 Proof™ (Wordmark)</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99724252&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99724252</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 025, 041 — Apparel; Music</td>
          </tr>
          <tr>
            <td style={td}>Mudslide Map™</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99723679&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99723679</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 035, 041 — Marketing; Entertainment</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ color: '#111' }}>Marks Owned by David W. MacCutcheon</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={th}>Mark</th>
            <th style={th}>Serial #</th>
            <th style={th}>Status</th>
            <th style={th}>Classes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>Survival Connect™</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99368463&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99368463</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 009, 042, 045</td>
          </tr>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <td style={td}>PawsNet™</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99350235&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99350235</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 009, 042, 045</td>
          </tr>
          <tr>
            <td style={td}>Kairos Keeper™</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99350019&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99350019</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 009, 042</td>
          </tr>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <td style={td}>PrepPals™</td>
            <td style={td}><a href="https://tsdr.uspto.gov/#caseNumber=99368410&caseType=SERIAL_NO&searchType=statusSearch" style={{ color: '#0b5bd3' }}>99368410</a></td>
            <td style={td}>Live / Pending</td>
            <td style={td}>IC 009, 042, 045</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ color: '#111' }}>Unauthorized Use</h2>
      <p>
        Unauthorized use, reproduction, or imitation of any of the above marks in commerce —
        including in connection with goods, services, websites, social media, or promotional
        materials — is strictly prohibited and may constitute trademark infringement under
        federal and state law.
      </p>

      <h2 style={{ color: '#111' }}>Licensing</h2>
      <p>
        Inquiries regarding licensing or authorized use of any mark should be directed to:
      </p>
      <p><a href="mailto:hello@macandsac.com" style={{ color: '#0b5bd3' }}>hello@macandsac.com</a></p>
    </main>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #ddd', fontSize: 14
}
const td: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 14, verticalAlign: 'top'
}
