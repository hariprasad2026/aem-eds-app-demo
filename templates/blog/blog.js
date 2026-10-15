import decorateArticle from '../article/article.js';

/**
 * Blog template (Site Global Templates: blog): the article structure (Page Header and
 * "About the author"), with the blog styles of blog.css.
 * @param {Element} main
 */
export default function decorate(main) {
  decorateArticle(main);
}
