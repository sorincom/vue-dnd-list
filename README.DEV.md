# Publish new version to npm

Source: [Understanding NPM Versioning With Git Tags](https://medium.com/@barberdt/understanding-npm-versioning-with-git-tags-ce669fc93dbb)

In `dev` branch:

1. Have a clean Git status (commit) in `dev` branch
2. `npm version patch`
3. `git push --tags origin dev`
4. `npm run build`
5. `npm publish`
6. `git checkout main`
7. `git merge dev`
8. `git push`
7. `git checkout dev`