import { fetchWpJson, getWordPressBaseUrl } from "../../lib/wordpress";

type WpPost = {
  id: number;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  date: string;
};

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export default async function WordPressFeedPage() {
  let posts: WpPost[] = [];
  let errorMessage = "";

  try {
    posts = await fetchWpJson<WpPost[]>("/wp/v2/posts?per_page=6&_embed=1");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Next + WordPress</h1>
      <p style={{ marginTop: 0, marginBottom: 28, color: "#555" }}>
        WordPress base URL: <code>{getWordPressBaseUrl()}</code>
      </p>

      {errorMessage ? (
        <section style={{ background: "#fff3f3", border: "1px solid #ffd1d1", padding: 16, borderRadius: 10 }}>
          <h2 style={{ marginTop: 0, color: "#a40000" }}>Cannot load posts</h2>
          <p style={{ marginBottom: 0, color: "#333" }}>{errorMessage}</p>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 14 }}>
          {posts.map((post) => (
            <article key={post.id} style={{ border: "1px solid #e6e6e6", borderRadius: 10, padding: 16 }}>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>
                <a href={post.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#0b66c3" }}>
                  {stripHtml(post.title.rendered)}
                </a>
              </h2>
              <p style={{ marginTop: 0, marginBottom: 10, color: "#555", fontSize: 14 }}>
                {new Date(post.date).toLocaleString()}
              </p>
              <p style={{ margin: 0, color: "#222" }}>{stripHtml(post.excerpt.rendered)}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
