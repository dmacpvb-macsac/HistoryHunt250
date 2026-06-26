export default function Copyrights() {
  return (
    <main style={{ fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: 'auto', padding: '40px 20px', lineHeight: 1.7, color: '#222' }}>
      <h1 style={{ color: '#111' }}>Copyright Notice</h1>
      <p style={{ color: '#666', fontSize: 14 }}>Effective Date: June 25, 2026</p>

      <p>
        All original content created by Mac &amp; Sac Enterprises LLC and David W. MacCutcheon
        is protected under U.S. and international copyright law. The following works have been
        registered with the United States Copyright Office.
      </p>

      <h2 style={{ color: '#111' }}>Registered Works</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={th}>Title</th>
            <th style={th}>Type</th>
            <th style={th}>Case #</th>
            <th style={th}>Filed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>America 250 Proof Meme Series Vol. 1 and 6 Other Unpublished Works</td>
            <td style={td}>Visual Arts</td>
            <td style={td}>1-15143596511</td>
            <td style={td}>Apr 16, 2026</td>
          </tr>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <td style={td}>America 250 Proof</td>
            <td style={td}>Performing Arts</td>
            <td style={td}>1-15126897501</td>
            <td style={td}>Mar 24, 2026</td>
          </tr>
          <tr>
            <td style={td}>Mahalo to the People and 2 Other Unpublished Works</td>
            <td style={td}>Performing Arts</td>
            <td style={td}>1-15112675231</td>
            <td style={td}>Mar 4, 2026</td>
          </tr>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <td style={td}>Florida Sunshine State and 5 Other Unpublished Works</td>
            <td style={td}>Performing Arts</td>
            <td style={td}>1-15092473511</td>
            <td style={td}>Feb 5, 2026</td>
          </tr>
          <tr>
            <td style={td}>Mudslides in the Forecast</td>
            <td style={td}>Performing Arts</td>
            <td style={td}>1-15074028331</td>
            <td style={td}>Jan 11, 2026</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ color: '#111' }}>General Copyright Coverage</h2>
      <p>In addition to the registered works above, the following categories of content are protected by copyright:</p>
      <ul>
        <li>Music, lyrics, and compositions written or co-written by David W. MacCutcheon</li>
        <li>Logos, graphics, and visual branding for America 250 Proof™, History Hunt™, Mudslide Map™, and affiliated projects</li>
        <li>Website content, text, and educational materials on all Mac &amp; Sac properties</li>
        <li>Software, application code, and platform architecture</li>
        <li>Promotional materials, social media content, and campaign assets</li>
      </ul>

      <h2 style={{ color: '#111' }}>Permitted Use</h2>
      <p>
        Content may be shared for personal, non-commercial, and educational purposes with
        proper attribution. Any commercial use, reproduction, distribution, or derivative
        work requires written permission from Mac &amp; Sac Enterprises LLC.
      </p>

      <h2 style={{ color: '#111' }}>DMCA Policy</h2>
      <p>
        If you believe content on our platforms infringes your copyright, please send a
        written notice with your contact information, identification of the work, and
        location of the infringing material to:
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
