import purgecss from '@fullhuman/postcss-purgecss'

export default {
  plugins: [
    purgecss({
      content: ['./index.html', './src/**/*.jsx', './src/**/*.js'],
      safelist: ['focused', 'selected', 'has-error', 'is-dependency', 'panning-mode', 'panning-active']
    })
  ]
}
