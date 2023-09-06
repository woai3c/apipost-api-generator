/**
 * modified from https://github.com/vitejs/vite/blob/main/scripts/release.js
 */
import { execa } from 'execa'
import path from 'path'
import fs from 'fs'
import prompts from 'prompts'
import chalk from 'chalk'
import semver from 'semver'
import minimist from 'minimist'

const args = minimist(process.argv.slice(2))
const pkgDir = process.cwd()
const pkgPath = path.resolve(pkgDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const currentVersion = pkg.version
const pkgName = pkg.name.replace(/^@jc\//, '')

const versionIncrements = ['patch', 'minor', 'major']

const inc = (i) => semver.inc(currentVersion, i, 'beta')
const run = (bin, args, opts = {}) => execa(bin, args, { stdio: 'inherit', ...opts })
const step = (msg) => console.log(chalk.cyan(msg))

async function main() {
    let targetVersion = args._[0]
    console.log(targetVersion)
    if (!targetVersion) {
        // no explicit version, offer suggestions
        const { release } = await prompts({
            type: 'select',
            name: 'release',
            message: 'Select release type',
            choices: versionIncrements
                .map((i) => `${i} (${inc(i)})`)
                .concat(['custom'])
                .map((i) => ({ value: i, title: i })),
        })

        if (release === 'custom') {
            const res = await prompts({
                type: 'text',
                name: 'version',
                message: 'Input custom version',
                initial: currentVersion,
            })
            targetVersion = res.version
        } else {
            targetVersion = release.match(/\((.*)\)/)?.[1] || ''
        }
    }

    if (!semver.valid(targetVersion)) {
        throw new Error(`invalid target version: ${targetVersion}`)
    }

    const tag = pkgName === 'cli' ? `v${targetVersion}` : `${pkgName}@${targetVersion}`

    const { yes } = await prompts({
        type: 'confirm',
        name: 'yes',
        message: `Releasing ${tag}. Confirm?`,
    })

    if (!yes) {
        return
    }

    step('\nUpdating package version...')
    updateVersion(targetVersion)

    const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
    if (stdout) {
        step('\nCommitting changes...')
        await run('git', ['add', '-A'])
        await run('git', ['commit', '-m', `release: ${tag}`])
    } else {
        console.log('No changes to commit.')
    }

    step('\nPublishing package...')
    await publishPackage(targetVersion)

    step('\nPushing to Gitlab...')
    await run('git', ['push'])

    console.log()
}

function updateVersion(version) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    pkg.version = version
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

async function publishPackage(version) {
    const publicArgs = ['publish', '--access=public', '--registry=https://registry.npmjs.org/']

    try {
        await run('pnpm', publicArgs, {
            stdio: 'pipe',
        })
        console.log(chalk.green(`Successfully published ${pkgName}@${version}`))
    } catch (e) {
        if (e.stderr.match(/previously published/)) {
            console.log(chalk.red(`Skipping already published: ${pkgName}`))
        } else {
            throw e
        }
    }
}

main().catch((err) => {
    console.error(err)
})
