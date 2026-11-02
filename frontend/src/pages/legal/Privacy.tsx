import { SITE } from '@/lib/site';
import { ContactEmail, LegalPage } from './LegalPage';

// Describes what the code actually sends, stores and logs (README "Privacy"); update both together.
const Privacy = () => (
  <LegalPage title="Privacy notice">
    <p>
      {SITE.name} is a portfolio project built and run by {SITE.owner}. This notice explains what happens to the
      information you put into it, as required by the EU General Data Protection Regulation (GDPR).
    </p>

    <h2>The short version</h2>
    <ul>
      <li>There are no accounts. Your resume and job descriptions are not saved on the server.</li>
      <li>
        Before anything leaves your browser, email addresses, phone numbers and profile links in your resume are
        replaced with placeholders. They are put back into the results on your device.
      </li>
      <li>
        The rest of the text is sent to Google’s Gemini AI to produce your results. This demo uses Gemini’s free tier,
        which allows Google to use that text to improve its products (see <a href="#recipients">who receives your data</a>).
        Please use a sample resume, or remove anything you would not want to share.
      </li>
      <li>No cookies, analytics, advertising or third-party scripts.</li>
    </ul>

    <h2>Who is responsible</h2>
    <p>
      The data controller is {SITE.owner}. For any question or request about your data, email <ContactEmail />.
    </p>

    <h2>What is processed, why, and for how long</h2>
    <h3>Resumes, job descriptions and the name for a cover letter</h3>
    <p>
      You can paste text or choose a PDF, Word or text file. Files, including LinkedIn PDF exports, are read in your
      browser. Only the extracted text is sent, with contact details already replaced. The server passes it to
      Google Gemini, returns the result, and keeps nothing once the request ends. Resume text is never written to
      server logs. Results stay in your browser tab until you reload or close it.
    </p>
    <p>
      <strong>Legal basis:</strong> this processing is needed to provide the tool you asked to use (GDPR Article
      6(1)(b)).
    </p>
    <p>
      Don’t include sensitive details the tool doesn’t need, such as health information, religion, a photo, your
      date of birth or identity numbers.
    </p>

    <h3>A random usage ID</h3>
    <p>
      On your first visit your browser creates a random ID and keeps it in local storage. It is used to show your
      plan and how many AI analyses you have used this month. The server stores the ID, your plan (free), the date it
      was created and a monthly count. None of this is linked to your name, email or resume. It is kept until you ask
      for it to be deleted.
    </p>
    <p>
      <strong>Legal basis:</strong> legitimate interest in running fair-usage limits (Article 6(1)(f)).
    </p>

    <h3>Technical data</h3>
    <p>
      Like any website, the server receives your IP address, the address of each request and your browser type. Your
      IP address is held in memory for one minute to apply rate limits. The web server’s access logs, which include
      IP addresses, are kept for up to 30 days for security and troubleshooting. The application’s own logs record a
      request ID, the endpoint, the response status, timings and the AI model used. They contain no IP addresses and
      no resume content.
    </p>
    <p>
      <strong>Legal basis:</strong> legitimate interest in keeping the service secure and working (Article 6(1)(f)).
    </p>

    <h3>Payments</h3>
    <p>
      The Pro plan shown in the app demonstrates a Stripe billing integration. It isn’t on sale, and no real payments
      are taken.
    </p>

    <h2>What’s stored in your browser</h2>
    <ul>
      <li>
        <code>rt-theme</code>: your light, dark or system theme choice.
      </li>
      <li>
        <code>resume_tailor_user_id</code>: the random usage ID described above.
      </li>
    </ul>
    <p>
      Both are kept in local storage, not cookies. You can remove them at any time by clearing this site’s data in
      your browser settings.
    </p>

    <h2 id="recipients">Who receives your data</h2>
    <ul>
      <li>
        <strong>Google (Gemini API)</strong> receives the resume text (with contact details replaced) and the job
        descriptions. Under Google’s{' '}
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">
          Gemini API terms
        </a>{' '}
        for the free tier, Google may use what is sent, and the AI’s responses, to provide and improve its products,
        and human reviewers may read it. Google says it disconnects this data from the developer’s account and API key
        before review.
      </li>
      <li>
        <strong>The hosting provider</strong> that runs the server processes all traffic, including IP addresses, on
        my behalf.
      </li>
    </ul>
    <p>Nothing is sold or shared with anyone else, and nothing is used for advertising.</p>

    <h2>Transfers outside the EU</h2>
    <p>
      Google LLC is based in the United States and is certified under the EU–U.S. Data Privacy Framework. The European
      Commission has decided that the Framework provides adequate protection for personal data.
    </p>

    <h2>AI results and automated decisions</h2>
    <p>
      Scores, rewrites, cover letters and interview questions are generated by AI and can be wrong. They are
      suggestions for you to review. No decision is made about you, and nothing is sent to employers.
    </p>

    <h2>Your rights</h2>
    <p>
      You have the right to access your data and to correct it, delete it, restrict or object to its processing, and
      to receive it in a portable format. The only record on the server that relates to you is the random usage ID.
      To have it deleted, email <ContactEmail /> with the ID. You can find it in your browser’s developer tools under
      Local Storage, as <code>resume_tailor_user_id</code>. I will reply within one month.
    </p>
    <p>
      You can also complain to Ireland’s{' '}
      <a href="https://www.dataprotection.ie" target="_blank" rel="noreferrer">
        Data Protection Commission
      </a>{' '}
      or to the data protection authority where you live.
    </p>

    <h2>Children</h2>
    <p>{SITE.name} is not intended for anyone under 16.</p>

    <h2>Changes</h2>
    <p>If this notice changes, the date at the top will change too.</p>
  </LegalPage>
);

export default Privacy;
